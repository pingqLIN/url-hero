export function compositeImages(backgroundSrc: string, foregroundSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bgImg = new Image();
    bgImg.crossOrigin = 'Anonymous';
    bgImg.onload = () => {
      const fgImg = new Image();
      fgImg.crossOrigin = 'Anonymous';
      fgImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(backgroundSrc);

        ctx.drawImage(bgImg, 0, 0);
        // Calculate centered position for foreground
        // Ideally they have the same size, but just in case:
        const x = (canvas.width - fgImg.width) / 2;
        const y = (canvas.height - fgImg.height) / 2;
        ctx.drawImage(fgImg, x, y);
        
        resolve(canvas.toDataURL('image/png'));
      };
      fgImg.onerror = () => resolve(backgroundSrc);
      fgImg.src = foregroundSrc;
    };
    bgImg.onerror = () => resolve(backgroundSrc);
    bgImg.src = backgroundSrc;
  });
}

export function removeWhiteBackground(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(src);
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const width = canvas.width;
      const height = canvas.height;
      const tolerance = 240; // RGB > 240 is considered white
      
      // We will do a simple BFS flood fill from the edges
      const visited = new Uint8Array(width * height);
      const queue: number[] = [];
      
      // Helper to check if a pixel is "white"
      const isWhite = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return data[i] > tolerance && data[i + 1] > tolerance && data[i + 2] > tolerance;
      };
      
      // Add all edge pixels that are white to the queue
      for (let x = 0; x < width; x++) {
        if (isWhite(x, 0)) { queue.push(x); visited[x] = 1; }
        if (isWhite(x, height - 1)) { queue.push((height - 1) * width + x); visited[(height - 1) * width + x] = 1; }
      }
      for (let y = 0; y < height; y++) {
        if (isWhite(0, y)) { queue.push(y * width); visited[y * width] = 1; }
        if (isWhite(width - 1, y)) { queue.push(y * width + width - 1); visited[y * width + width - 1] = 1; }
      }
      
      let head = 0;
      while (head < queue.length) {
        const idx = queue[head++];
        const x = idx % width;
        const y = Math.floor(idx / width);
        
        // Make it transparent
        const pixelIdx = idx * 4;
        data[pixelIdx + 3] = 0;
        
        // Check neighbors
        const neighbors = [
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx] && isWhite(nx, ny)) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      }
      
      // Smooth edges slightly by adding partial transparency to border pixels
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 255) {
          const x = (i / 4) % width;
          const y = Math.floor((i / 4) / width);
          let hasTransparentNeighbor = false;
          const neighbors = [[x+1, y], [x-1, y], [x, y+1], [x, y-1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4;
              if (data[nIdx + 3] === 0) {
                hasTransparentNeighbor = true;
                break;
              }
            }
          }
          if (hasTransparentNeighbor) {
            // Soften the edge
            data[i + 3] = 128;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src); // fallback to original if error
    img.src = src;
  });
}
