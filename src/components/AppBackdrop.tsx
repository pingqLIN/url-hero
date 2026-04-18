import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { STANDARD_EASE } from '../constants';

type AppBackdropProps = {
  bgDepthMap: string;
  bgOverride: string | null;
  bgSequence: string[];
  previewMode?: boolean;
  isBusy?: boolean;
  isEditingConcept?: boolean;
};

type CoverMetrics = {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
};

const baseImageClass = 'absolute inset-0 h-full w-full object-cover';
const OBJECT_POSITION_X = 0.5;
const OBJECT_POSITION_Y = 0.39;
const DEPTH_RANGE_MIN = 0.08;
const DEPTH_RANGE_MAX = 0.82;
const DEPTH_SAMPLE_MAX_WIDTH = 1024;
const DEPTH_SAMPLE_RADIUS = 4;
const DEPTH_SAMPLE_SIGMA = 2.4;
const TARGET_DEPTH_EPSILON = 0.0008;
const CURRENT_DEPTH_SMOOTHING = 0.12;
const LIGHTING_DEPTH_SMOOTHING = 0.05;
const POINTER_SMOOTHING = 0.18;
const DUST_BOOST_SMOOTHING = 0.08;
const NEAR_DEPTH_BIAS = 0.58;
const GOLD_DUST_MULTIPLIER = 3;
const GOLD_DUST_PARTICLES = [
  { delay: '-7.2s', drift: '-18px', duration: '16s', opacity: 0.16, size: '5px', x: '8%' },
  { delay: '-2.8s', drift: '22px', duration: '13.5s', opacity: 0.12, size: '3px', x: '14%' },
  { delay: '-10.6s', drift: '-14px', duration: '18.2s', opacity: 0.1, size: '4px', x: '21%' },
  { delay: '-5.1s', drift: '16px', duration: '15.4s', opacity: 0.14, size: '6px', x: '29%' },
  { delay: '-12.4s', drift: '12px', duration: '19s', opacity: 0.09, size: '2px', x: '34%' },
  { delay: '-1.6s', drift: '-10px', duration: '14.8s', opacity: 0.13, size: '4px', x: '41%' },
  { delay: '-8.8s', drift: '18px', duration: '17.6s', opacity: 0.11, size: '5px', x: '48%' },
  { delay: '-4.2s', drift: '-12px', duration: '12.9s', opacity: 0.15, size: '3px', x: '56%' },
  { delay: '-9.7s', drift: '10px', duration: '18.8s', opacity: 0.08, size: '2px', x: '63%' },
  { delay: '-6.3s', drift: '-20px', duration: '16.9s', opacity: 0.12, size: '5px', x: '71%' },
  { delay: '-11.1s', drift: '15px', duration: '20.5s', opacity: 0.1, size: '4px', x: '78%' },
  { delay: '-3.4s', drift: '-8px', duration: '14.1s', opacity: 0.14, size: '3px', x: '86%' },
  { delay: '-13.6s', drift: '12px', duration: '17.8s', opacity: 0.12, size: '4px', x: '11%' },
  { delay: '-0.9s', drift: '-16px', duration: '15.6s', opacity: 0.15, size: '5px', x: '18%' },
  { delay: '-14.9s', drift: '20px', duration: '18.7s', opacity: 0.11, size: '3px', x: '26%' },
  { delay: '-6.8s', drift: '-9px', duration: '13.9s', opacity: 0.13, size: '4px', x: '38%' },
  { delay: '-2.1s', drift: '14px', duration: '16.1s', opacity: 0.1, size: '2px', x: '44%' },
  { delay: '-15.2s', drift: '-13px', duration: '19.4s', opacity: 0.12, size: '5px', x: '52%' },
  { delay: '-7.9s', drift: '11px', duration: '15.2s', opacity: 0.14, size: '3px', x: '59%' },
  { delay: '-4.8s', drift: '-17px', duration: '17.2s', opacity: 0.1, size: '4px', x: '68%' },
  { delay: '-12.7s', drift: '9px', duration: '20.1s', opacity: 0.09, size: '2px', x: '74%' },
  { delay: '-5.6s', drift: '-11px', duration: '14.7s', opacity: 0.13, size: '4px', x: '82%' },
] as const;

type SliceBlend = {
  baseIndex: number;
  overlayIndex: number | null;
  overlayOpacity: number;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

function computeCoverMetrics(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
): CoverMetrics {
  const scale = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;

  return {
    offsetX: (viewportWidth - renderedWidth) * OBJECT_POSITION_X,
    offsetY: (viewportHeight - renderedHeight) * OBJECT_POSITION_Y,
    renderedWidth,
    renderedHeight,
  };
}

function readDepthValue(data: Uint8ClampedArray, index: number) {
  return (data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114) / 255;
}

function sampleDepthAt(depthPixels: Uint8ClampedArray, depthWidth: number, depthHeight: number, x: number, y: number) {
  const sampleX = clamp(x, 0, depthWidth - 1);
  const sampleY = clamp(y, 0, depthHeight - 1);
  const left = Math.floor(sampleX);
  const top = Math.floor(sampleY);
  const right = Math.min(depthWidth - 1, left + 1);
  const bottom = Math.min(depthHeight - 1, top + 1);
  const mixX = sampleX - left;
  const mixY = sampleY - top;
  const topLeft = readDepthValue(depthPixels, (top * depthWidth + left) * 4);
  const topRight = readDepthValue(depthPixels, (top * depthWidth + right) * 4);
  const bottomLeft = readDepthValue(depthPixels, (bottom * depthWidth + left) * 4);
  const bottomRight = readDepthValue(depthPixels, (bottom * depthWidth + right) * 4);
  const topBlend = topLeft + (topRight - topLeft) * mixX;
  const bottomBlend = bottomLeft + (bottomRight - bottomLeft) * mixX;

  return topBlend + (bottomBlend - topBlend) * mixY;
}

function buildDownsampledDepthData(image: HTMLImageElement) {
  const targetWidth = Math.min(image.width, DEPTH_SAMPLE_MAX_WIDTH);
  const targetHeight = Math.max(1, Math.round((image.height / image.width) * targetWidth));
  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = targetWidth;
  depthCanvas.height = targetHeight;
  const depthContext = depthCanvas.getContext('2d', { willReadFrequently: true });

  if (!depthContext) {
    throw new Error('Unable to create depth canvas.');
  }

  depthContext.imageSmoothingEnabled = true;
  depthContext.imageSmoothingQuality = 'high';
  depthContext.drawImage(image, 0, 0, targetWidth, targetHeight);

  const depthImageData = depthContext.getImageData(0, 0, targetWidth, targetHeight);

  return {
    depthPixels: depthImageData.data,
    depthWidth: targetWidth,
    depthHeight: targetHeight,
  };
}

function sampleFocusDepth(
  pointerX: number,
  pointerY: number,
  viewportWidth: number,
  viewportHeight: number,
  depthWidth: number,
  depthHeight: number,
  depthPixels: Uint8ClampedArray,
) {
  const metrics = computeCoverMetrics(viewportWidth, viewportHeight, depthWidth, depthHeight);
  const imageX = ((pointerX - metrics.offsetX) / metrics.renderedWidth) * depthWidth;
  const imageY = ((pointerY - metrics.offsetY) / metrics.renderedHeight) * depthHeight;
  let totalDepth = 0;
  let totalWeight = 0;

  for (let offsetY = -DEPTH_SAMPLE_RADIUS; offsetY <= DEPTH_SAMPLE_RADIUS; offsetY += 1) {
    for (let offsetX = -DEPTH_SAMPLE_RADIUS; offsetX <= DEPTH_SAMPLE_RADIUS; offsetX += 1) {
      const distanceSquared = offsetX * offsetX + offsetY * offsetY;
      const weight = Math.exp(-distanceSquared / (2 * DEPTH_SAMPLE_SIGMA * DEPTH_SAMPLE_SIGMA));

      totalDepth += sampleDepthAt(depthPixels, depthWidth, depthHeight, imageX + offsetX, imageY + offsetY) * weight;
      totalWeight += weight;
    }
  }

  return totalDepth / Math.max(totalWeight, 0.0001);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createSliceBlend(depth: number, count: number): SliceBlend {
  const normalizedDepth = (depth - DEPTH_RANGE_MIN) / (DEPTH_RANGE_MAX - DEPTH_RANGE_MIN);
  const clampedDepth = clamp(normalizedDepth, 0, 1);
  const biasedDepth = Math.pow(clampedDepth, NEAR_DEPTH_BIAS);
  const position = biasedDepth * (count - 1);
  const baseIndex = clamp(Math.floor(position), 0, count - 1);
  const overlayIndex = Math.min(count - 1, baseIndex + 1);
  const overlayOpacity = overlayIndex === baseIndex ? 0 : position - baseIndex;

  return {
    baseIndex,
    overlayIndex: overlayIndex === baseIndex ? null : overlayIndex,
    overlayOpacity,
  };
}

function computeCentralDustBoost(pointerX: number, viewportWidth: number) {
  if (!viewportWidth) {
    return 0;
  }

  const normalizedX = pointerX / viewportWidth;
  const distanceFromCenter = Math.abs(normalizedX - 0.5);
  const dustZoneHalfWidth = 0.125;
  const normalizedDistance = clamp(distanceFromCenter / dustZoneHalfWidth, 0, 1);

  return 1 - normalizedDistance;
}

function AppBackdrop({ bgDepthMap, bgOverride, bgSequence, previewMode = false, isBusy = false, isEditingConcept = false }: AppBackdropProps) {
  const objectPosition = previewMode ? '50% 47%' : '50% 39%';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const focusLightRef = useRef<HTMLDivElement | null>(null);
  const focusShadowRef = useRef<HTMLDivElement | null>(null);
  const goldDustFieldRef = useRef<HTMLDivElement | null>(null);
  const isBusyRef = useRef(isBusy);
  const previewModeRef = useRef(previewMode);
  const isEditingConceptRef = useRef(isEditingConcept);
  const startLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isBusyRef.current = isBusy;
    previewModeRef.current = previewMode;
    isEditingConceptRef.current = isEditingConcept;
    if (startLoopRef.current) {
      startLoopRef.current();
    }
  }, [isBusy, previewMode, isEditingConcept]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined' || bgSequence.length === 0) {
      return undefined;
    }

    let disposed = false;
    let frame = 0;
    let depthPixels: Uint8ClampedArray | null = null;
    let depthWidth = 0;
    let depthHeight = 0;

    const fallbackIndex = Math.min(bgSequence.length - 1, Math.floor((bgSequence.length - 1) * 0.5));
    const state = {
      currentDepth: 0.5,
      currentLightingDepth: 0.5,
      currentLightingIntensity: isBusyRef.current ? 0.15 : 1,
      currentShadowAlphaMultiplier: 1,
      currentClearCenterRadiusMultiplier: 1,
      currentDustBoost: 0,
      targetDepth: 0.5,
      targetLightingDepth: 0.5,
      targetDustBoost: 0,
      currentPointerX: 0,
      currentPointerY: 0,
      targetPointerX: 0,
      targetPointerY: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      breathingStartTime: 0,
    };

    const applyBlend = (blend: SliceBlend) => {
      for (let index = 0; index < imageRefs.current.length; index += 1) {
        const image = imageRefs.current[index];
        if (!image) {
          continue;
        }

        let opacity = 0;
        if (!readyRef.current) {
          opacity = index === fallbackIndex ? 1 : 0;
        } else if (index === blend.baseIndex) {
          opacity = 1;
        } else if (index === blend.overlayIndex) {
          opacity = blend.overlayOpacity;
        }

        image.style.opacity = `${opacity}`;
      }
    };

    const applyFocusLighting = () => {
      const focusLight = focusLightRef.current;
      const focusShadow = focusShadowRef.current;
      const goldDustField = goldDustFieldRef.current;
      if (!focusLight || !focusShadow || !state.viewportWidth || !state.viewportHeight) {
        return;
      }

      const pointerXPercent = (state.currentPointerX / state.viewportWidth) * 100;
      const pointerYPercent = (state.currentPointerY / state.viewportHeight) * 100;
      const normalizedDepth = clamp(
        (state.currentLightingDepth - DEPTH_RANGE_MIN) / (DEPTH_RANGE_MAX - DEPTH_RANGE_MIN),
        0,
        1,
      );
      // Invert the depth gradient for the spotlight effect
      const invertedDepth = 1 - normalizedDepth;
      const farFactor = invertedDepth;
      const nearFactor = 1 - farFactor;
      const depthLiftPx = 16 + nearFactor * 38;
      const lightCenterYPercent = clamp(((state.currentPointerY - depthLiftPx) / state.viewportHeight) * 100, 0, 100);
      const clearCenterRadiusPx = Math.max(state.viewportHeight * (0.3 + nearFactor * 0.2), 340) * state.currentClearCenterRadiusMultiplier;
      const lightCoreRadiusPx = clearCenterRadiusPx * (0.34 + nearFactor * 0.12);
      const lightGlowRadiusPx = clearCenterRadiusPx + (70 + nearFactor * 120) * 4.6;
      const shadowEntryRadiusPx = clearCenterRadiusPx + (80 + farFactor * 44) * 2.2;
      const shadowOuterRadiusPx = clearCenterRadiusPx + (240 + farFactor * 120) * 2.85;
      
      const intensity = state.currentLightingIntensity;
      const lightCoreAlpha = (0.014 + nearFactor * 0.096) * 0.6 * intensity;
      const lightGlowAlpha = (0.003 + nearFactor * 0.028) * 0.6 * intensity;
      const shadowMidAlpha = (0.42 + farFactor * 0.24) * state.currentShadowAlphaMultiplier;
      const shadowOuterAlpha = (0.3 + farFactor * 0.22) * state.currentShadowAlphaMultiplier;

      focusLight.style.background = `
        radial-gradient(
          circle at ${pointerXPercent}% ${lightCenterYPercent}%,
          rgba(255,255,255,${lightCoreAlpha}) 0px,
          rgba(255,255,255,${lightCoreAlpha}) ${Math.max(lightCoreRadiusPx * 0.14, 30)}px,
          rgba(255,255,255,${lightGlowAlpha}) ${Math.max(lightCoreRadiusPx * 0.72, 96)}px,
          rgba(255,255,255,0) ${Math.max(lightGlowRadiusPx * 2.6, 680)}px
        ),
        radial-gradient(
          circle at ${pointerXPercent}% ${pointerYPercent}%,
          rgba(160,220,255,${lightGlowAlpha * 0.72}) 0px,
          rgba(160,220,255,${lightGlowAlpha * 0.4}) ${Math.max(lightGlowRadiusPx * 0.9, 220)}px,
          rgba(160,220,255,0) ${Math.max(lightGlowRadiusPx * 2.35, 680)}px
        )
      `;
      focusShadow.style.background = `radial-gradient(
        circle at ${pointerXPercent}% ${pointerYPercent}%,
        rgba(2,6,18,0) 0px,
        rgba(2,6,18,0) ${clearCenterRadiusPx}px,
        rgba(2,6,18,${shadowMidAlpha}) ${shadowEntryRadiusPx}px,
        rgba(2,6,18,${shadowOuterAlpha}) ${shadowOuterRadiusPx}px,
        rgba(2,6,18,0) ${Math.max(shadowOuterRadiusPx + 420, state.viewportHeight * 2.8)}px
      )`;

      if (goldDustField) {
        goldDustField.style.opacity = `${0.34 + state.currentDustBoost * 0.3}`;
      }
    };

    const stopLoop = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const draw = () => {
      let targetIntensity = 1;
      let targetShadowAlphaMultiplier = 1;
      let targetClearCenterRadiusMultiplier = 1;
      let intensitySmoothing = 0.08;
      const now = performance.now();

      if (isEditingConceptRef.current) {
        state.breathingStartTime = 0;
        targetIntensity = 0;
        targetShadowAlphaMultiplier = 1.6;
        targetClearCenterRadiusMultiplier = 0;
      } else if (isBusyRef.current) {
        if (previewModeRef.current) {
          if (!state.breathingStartTime) {
            state.breathingStartTime = now;
          }
          const elapsed = now - state.breathingStartTime;
          const breathProgress = Math.min(elapsed / 2000, 1); // 2 seconds transition to full breathing
          // Sine wave for breathing: oscillates between 0.4 and 1.6
          const sine = Math.sin(elapsed * 0.0025);
          targetIntensity = 1.0 + (sine * 0.6 * breathProgress);
          intensitySmoothing = 0.1; // Fast enough to track the sine wave
        } else {
          state.breathingStartTime = 0;
          targetIntensity = 0.15;
        }
      } else {
        state.breathingStartTime = 0;
        if (previewModeRef.current) {
          targetIntensity = 1;
          intensitySmoothing = 0.015; // Slow down the transition back to normal (approx 2s to match image fade-in)
        }
      }
      state.currentLightingIntensity += (targetIntensity - state.currentLightingIntensity) * intensitySmoothing;
      state.currentShadowAlphaMultiplier += (targetShadowAlphaMultiplier - state.currentShadowAlphaMultiplier) * intensitySmoothing;
      state.currentClearCenterRadiusMultiplier += (targetClearCenterRadiusMultiplier - state.currentClearCenterRadiusMultiplier) * intensitySmoothing;
      
      if (previewModeRef.current) {
        state.targetPointerX = state.viewportWidth * 0.5;
        state.targetPointerY = state.viewportHeight * 0.5;
      }

      state.currentPointerX += (state.targetPointerX - state.currentPointerX) * POINTER_SMOOTHING;
      state.currentPointerY += (state.targetPointerY - state.currentPointerY) * POINTER_SMOOTHING;
      state.currentDepth += (state.targetDepth - state.currentDepth) * CURRENT_DEPTH_SMOOTHING;
      state.currentLightingDepth += (state.targetLightingDepth - state.currentLightingDepth) * LIGHTING_DEPTH_SMOOTHING;
      state.currentDustBoost += (state.targetDustBoost - state.currentDustBoost) * DUST_BOOST_SMOOTHING;
      applyBlend(createSliceBlend(state.currentDepth, bgSequence.length));
      applyFocusLighting();

      if (
        Math.abs(state.targetDepth - state.currentDepth) > 0.0015 ||
        Math.abs(state.targetLightingDepth - state.currentLightingDepth) > 0.0012 ||
        Math.abs(state.targetDustBoost - state.currentDustBoost) > 0.01 ||
        Math.abs(state.targetPointerX - state.currentPointerX) > 0.35 ||
        Math.abs(state.targetPointerY - state.currentPointerY) > 0.35 ||
        Math.abs(targetIntensity - state.currentLightingIntensity) > 0.01 ||
        (isBusyRef.current && previewModeRef.current)
      ) {
        frame = window.requestAnimationFrame(draw);
      } else {
        frame = 0;
      }
    };

    const startLoop = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const updateTargetDepth = () => {
      if (!depthPixels || !state.viewportWidth || !state.viewportHeight) {
        return;
      }

      const sampledDepth = sampleFocusDepth(
        state.targetPointerX,
        state.targetPointerY,
        state.viewportWidth,
        state.viewportHeight,
        depthWidth,
        depthHeight,
        depthPixels,
      );
      if (Math.abs(sampledDepth - state.targetDepth) < TARGET_DEPTH_EPSILON) {
        return;
      }

      state.targetDepth = sampledDepth;
      state.targetLightingDepth = sampledDepth;
      state.targetDustBoost = computeCentralDustBoost(state.targetPointerX, state.viewportWidth);
      startLoop();
    };

    const syncViewport = () => {
      const rect = root.getBoundingClientRect();
      state.viewportWidth = Math.max(1, rect.width);
      state.viewportHeight = Math.max(1, rect.height);

      if (!state.targetPointerX && !state.targetPointerY) {
        state.targetPointerX = state.viewportWidth * 0.5;
        state.targetPointerY = state.viewportHeight * 0.5;
        state.currentPointerX = state.targetPointerX;
        state.currentPointerY = state.targetPointerY;
      } else {
        state.targetPointerX = Math.min(state.viewportWidth, Math.max(0, state.targetPointerX));
        state.targetPointerY = Math.min(state.viewportHeight, Math.max(0, state.targetPointerY));
        state.currentPointerX = Math.min(state.viewportWidth, Math.max(0, state.currentPointerX));
        state.currentPointerY = Math.min(state.viewportHeight, Math.max(0, state.currentPointerY));
      }

      updateTargetDepth();
      applyFocusLighting();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (previewModeRef.current) {
        state.targetPointerX = state.viewportWidth * 0.5;
        state.targetPointerY = state.viewportHeight * 0.5;
      } else {
        const rect = root.getBoundingClientRect();
        state.targetPointerX = event.clientX - rect.left;
        state.targetPointerY = event.clientY - rect.top;
      }
      updateTargetDepth();
      startLoop();
    };

    const handlePointerLeave = () => {
      state.targetPointerX = state.viewportWidth * 0.5;
      state.targetPointerY = state.viewportHeight * 0.5;
      updateTargetDepth();
      startLoop();
    };

    const initialize = async () => {
      readyRef.current = false;
      applyBlend(createSliceBlend(0.5, bgSequence.length));

      try {
        const depthImage = await loadImage(bgDepthMap);

        if (disposed) {
          return;
        }

        const depthData = buildDownsampledDepthData(depthImage);
        depthPixels = depthData.depthPixels;
        depthWidth = depthData.depthWidth;
        depthHeight = depthData.depthHeight;

        syncViewport();
        state.currentDepth = state.targetDepth;
        readyRef.current = true;
        applyBlend(createSliceBlend(state.currentDepth, bgSequence.length));
        applyFocusLighting();

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('blur', handlePointerLeave);
        window.addEventListener('resize', syncViewport);
        document.documentElement.addEventListener('mouseleave', handlePointerLeave);
      } catch (error) {
        console.error(error);
      }
    };

    void initialize();

    return () => {
      disposed = true;
      stopLoop();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', handlePointerLeave);
      window.removeEventListener('resize', syncViewport);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [bgDepthMap, bgSequence]);

  const fallbackIndex = Math.min(bgSequence.length - 1, Math.floor((bgSequence.length - 1) * 0.5));
  const imageElements = useMemo(
    () =>
      bgSequence.map((src, index) => (
        <img
          ref={(element) => {
            imageRefs.current[index] = element;
          }}
          key={src}
          src={src}
          alt=""
          className={baseImageClass}
          style={{
            opacity: index === fallbackIndex ? 1 : 0,
            backfaceVisibility: 'hidden',
            objectPosition,
            transform: previewMode ? 'translateZ(0) scale(1.2)' : 'translateZ(0)',
            willChange: 'opacity',
          }}
        />
      )),
    [bgSequence, fallbackIndex, objectPosition, previewMode],
  );
  const dustElements = useMemo(
    () =>
      Array.from({ length: GOLD_DUST_MULTIPLIER }, (_, copyIndex) =>
        GOLD_DUST_PARTICLES.map((particle, particleIndex) => {
          const xValue = Number.parseFloat(particle.x);
          const delayValue = Number.parseFloat(particle.delay);
          const durationValue = Number.parseFloat(particle.duration);
          const driftValue = Number.parseFloat(particle.drift);
          const sizeValue = Number.parseFloat(particle.size);
          const horizontalJitter = ((copyIndex * 7 + particleIndex * 3) % 11) - 5;
          const verticalPhase = ((copyIndex * 1.17 + particleIndex * 0.43) % 6) * -1.35;
          const driftJitter = ((copyIndex + particleIndex) % 9) - 4;
          const sizeJitter = ((copyIndex + particleIndex) % 3) * 0.6;
          const opacityScale = 0.84 + ((copyIndex + particleIndex) % 5) * 0.04;

          return (
            <span
              key={`${particle.x}-${particle.delay}-${copyIndex}-${particleIndex}`}
              className="hero-gold-dust-cluster"
              style={{
                '--gold-dust-delay': `${delayValue + verticalPhase}s`,
                '--gold-dust-drift': `${driftValue + driftJitter}px`,
                '--gold-dust-duration': `${durationValue + (copyIndex % 4) * 0.55}s`,
                left: `${Math.min(96, Math.max(4, xValue + horizontalJitter))}%`,
              } as CSSProperties}
            >
              <span
                className="hero-gold-dust"
                style={{
                  '--gold-dust-opacity': Math.min(particle.opacity * opacityScale, 0.24),
                  '--gold-dust-size': `${sizeValue + sizeJitter}px`,
                  left: '0px',
                  top: '0px',
                } as CSSProperties}
              />
            </span>
          );
        }),
      ).flat(),
    [],
  );

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-0 overflow-hidden">
      {imageElements}
      <div
        ref={focusLightRef}
        className="absolute inset-0"
        style={{
          mixBlendMode: 'plus-lighter',
          willChange: 'background',
        }}
      />
      <div
        ref={focusShadowRef}
        className="absolute inset-0"
        style={{
          mixBlendMode: 'multiply',
          willChange: 'background',
        }}
      />
      <div
        ref={goldDustFieldRef}
        className={`hero-gold-dust-field absolute left-[37.5%] top-0 bottom-[clamp(150px,22vh,280px)] w-[25%] overflow-hidden ${previewMode ? 'hero-gold-dust-field--preview' : ''}`}
      >
        {dustElements}
      </div>
      <AnimatePresence>
        {bgOverride && (
          <motion.img
            key="bg-override"
            src={bgOverride}
            alt=""
            className={baseImageClass}
            style={{ objectPosition, transform: previewMode ? 'scale(1.2)' : undefined }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, exit: { duration: 0.45 }, ease: STANDARD_EASE }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AppBackdrop;
