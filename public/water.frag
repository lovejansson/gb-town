precision mediump float;

uniform float uTime;
uniform vec2 uResolution; // size of graphics width and height in pixels
uniform vec3 uWaveColor;
uniform vec3 uWaveColorShadow;
uniform vec3 uWaterColor;
uniform vec3 uWaterColorShadow;
uniform float uTranslate;
uniform vec2 uDockShadowPos;
uniform float uDockShadowWidth;
uniform float uDockShadowHeight;
varying vec2 vTextureCoord;
varying vec2 vFragPos;

//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20201014 (stegu)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289((x * 34.0 + 10.0) * x);
}

vec4 permute(vec4 x) {
  return mod289((x * 34.0 + 10.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187, // (3.0-sqrt(3.0))/6.0
    0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
    -0.577350269189626, // -1.0 + 2.0 * C.x
    0.024390243902439
  ); // 1.0 / 41.0
  // First corner
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
    0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
    0.0
  );
  m = m * m;
  m = m * m;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  // Compute final noise value at P
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i);
  vec4 p = permute(
    permute(
      permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
        i.y +
        vec4(0.0, i1.y, i2.y, 1.0)
    ) +
      i.x +
      vec4(0.0, i1.x, i2.x, 1.0)
  );

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_); // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(
    vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))
  );
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(
    0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)),
    0.0
  );
  m = m * m;
  return 105.0 *
  dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main(void ) {
  vec2 pixelPos = vFragPos * uResolution; // Convert fragment position in uv space to pixel space

  pixelPos = floor(pixelPos); // muy importante to floor since otherwise the sample of pixels are including fractions which makes the lines so smooth.

  vec2 cellSize = vec2(32.0, 32.0); // Cell size in pixel space

  vec2 cell = floor(pixelPos / cellSize) * cellSize; // Cell pos in pixel space

  vec2 cellUv = cell / uResolution; // Cell pos in uv space

  // Create noise for pixel

  float scale = 0.08;

  float ax = snoise(vec3(pixelPos.x * scale, pixelPos.y * scale, uTime));
  
  float ay = snoise(
    vec3(pixelPos.x * scale + 20.0, pixelPos.y * scale + 20.0, uTime)
  );

  float bx = snoise(
    vec3(pixelPos.x * scale + ax, pixelPos.y * scale + ay, uTime)
  );

  float by = snoise(
    vec3(pixelPos.x * scale + ax + 20.0, pixelPos.y * scale + ay + 20.0, uTime)
  );

  float wave = sin(uTime * 0.5) * 0.5 + 0.5;

  float warpStrength = wave * 8.0;

  float warpStrength2 = 10.0;

  // pixelPos.x += bx * warpStrength;
  // pixelPos.y += by * warpStrength;

  pixelPos.x += ax * 2.0;
  pixelPos.y += ay * 2.0;

  float minDist = 9999.0;
  float secondMinDist = 9999.0;

  vec2 points[8];
  points[0] = cell;
  points[1] = vec2(cell.x - cellSize.x, cell.y - cellSize.y);
  points[2] = vec2(cell.x, cell.y - cellSize.y);
  points[3] = vec2(cell.x + cellSize.x, cell.y - cellSize.y);
  points[4] = vec2(cell.x + cellSize.x, cell.y);
  points[5] = vec2(cell.x + cellSize.x, cell.y + cellSize.y);
  points[6] = vec2(cell.x, cell.y + cellSize.y);
  points[7] = vec2(cell.x - cellSize.x, cell.y + cellSize.y);

  bool isShadow = pixelPos.x >= uDockShadowPos.x && pixelPos.x <= uDockShadowPos.x + uDockShadowWidth &&  pixelPos.y >= uDockShadowPos.y && pixelPos.y <= uDockShadowPos.y + uDockShadowHeight;

  vec3 waveColor = isShadow ? uWaveColorShadow : uWaveColor;
  vec3 waterColor = isShadow ? uWaterColorShadow : uWaterColor;

  float edgeSize =   pixelPos.y < 16.0 ? 0.5 : 1.25;

  for (int i = 0; i < 8; i++) {
    float offP = snoise(vec2(points[i].x * 0.01, points[i].y * 0.01)) * 8.0;
    points[i].x += offP;
    points[i].y += offP;

    // points[i].x += uTranslate;
    // points[i].y += uTranslate;

    float dist = distance(pixelPos, points[i]);

    if (dist < minDist) {
      secondMinDist = minDist;
      minDist = dist;
    } else if (dist < secondMinDist) {
      secondMinDist = dist;
    }
  }

  float edge = secondMinDist - minDist;

  if (edge < 0.5) {
    gl_FragColor = vec4(vec3(waveColor), 1.0);
  } else {
    gl_FragColor = vec4(waterColor, 1.0);
  }

}

