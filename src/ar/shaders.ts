export type EffectId = 'neural' | 'chrome' | 'glitch' | 'prism' | 'wire';

export interface EffectDefinition {
  id: EffectId;
  name: string;
  description: string;
}

export const EFFECTS: EffectDefinition[] = [
  {
    id: 'neural',
    name: 'Neural Glow',
    description: 'Soft bioluminescent mesh mapped to your face.',
  },
  {
    id: 'chrome',
    name: 'Liquid Chrome',
    description: 'Mirror-skin reflections that shift with motion.',
  },
  {
    id: 'glitch',
    name: 'Identity Glitch',
    description: 'Fragmented AI signal tearing through features.',
  },
  {
    id: 'prism',
    name: 'Prism Mind',
    description: 'Spectral refraction across facial geometry.',
  },
  {
    id: 'wire',
    name: 'Wireframe AI',
    description: 'Blueprint lattice of a machine-read face.',
  },
];

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform int uMode;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
    float n = noise(vUv * 8.0 + uTime * 0.35);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + vUv.y * 12.0);
    vec3 color = mix(uColorA, uColorB, vUv.y);
    float alpha = 0.35;

    if (uMode == 0) {
      // Neural glow
      float veins = smoothstep(0.35, 0.75, noise(vUv * 14.0 + uTime * 0.5));
      color = mix(uColorA, uColorB, veins + fresnel * 0.5);
      color += vec3(0.1, 0.35, 0.25) * pulse * uIntensity;
      alpha = mix(0.25, 0.72, fresnel + veins * 0.4) * uIntensity;
    } else if (uMode == 1) {
      // Liquid chrome
      vec3 reflectDir = reflect(normalize(vWorldPos), normalize(vNormal));
      float spec = pow(max(dot(reflectDir, normalize(vec3(0.2, 0.8, 0.5))), 0.0), 18.0);
      color = mix(vec3(0.55, 0.62, 0.7), vec3(0.9, 0.95, 1.0), fresnel);
      color += uColorA * spec * 1.4;
      color += uColorB * n * 0.25;
      alpha = mix(0.45, 0.9, fresnel) * uIntensity;
    } else if (uMode == 2) {
      // Identity glitch
      float band = step(0.92, fract(vUv.y * 28.0 + uTime * 3.5 + n));
      float shift = (hash(vec2(floor(vUv.y * 40.0), floor(uTime * 8.0))) - 0.5) * 0.08;
      float tear = smoothstep(0.4, 0.9, noise(vUv * vec2(30.0, 4.0) + uTime * 2.0));
      color = mix(uColorA, uColorB, tear);
      color.rb += shift * 2.0 * uIntensity;
      color += vec3(band) * 0.55;
      alpha = mix(0.2, 0.85, tear + band) * uIntensity;
    } else if (uMode == 3) {
      // Prism mind
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      float rainbow = 0.5 + 0.5 * sin(angle * 3.0 + uTime + fresnel * 6.0);
      color = mix(uColorA, uColorB, rainbow);
      color += vec3(0.35, 0.15, 0.55) * fresnel;
      color += vec3(n * 0.2);
      alpha = mix(0.3, 0.8, fresnel + rainbow * 0.3) * uIntensity;
    } else {
      // Wireframe AI
      float gridX = abs(fract(vUv.x * 24.0) - 0.5);
      float gridY = abs(fract(vUv.y * 24.0) - 0.5);
      float line = 1.0 - smoothstep(0.0, 0.04, min(gridX, gridY));
      float scan = smoothstep(0.0, 0.15, abs(fract(vUv.y * 2.0 - uTime * 0.4) - 0.5));
      color = mix(uColorA * 0.25, uColorB, line);
      color += vec3(0.05, 0.2, 0.15) * (1.0 - scan);
      alpha = max(line * 0.95, fresnel * 0.25) * uIntensity;
    }

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95));
  }
`;

export const MODE_COLORS: Record<EffectId, { a: [number, number, number]; b: [number, number, number] }> = {
  neural: { a: [0.05, 0.45, 0.35], b: [0.18, 0.95, 0.7] },
  chrome: { a: [0.7, 0.85, 0.95], b: [0.95, 0.75, 0.45] },
  glitch: { a: [0.95, 0.2, 0.35], b: [0.15, 0.9, 0.85] },
  prism: { a: [0.2, 0.55, 0.95], b: [0.95, 0.55, 0.25] },
  wire: { a: [0.05, 0.2, 0.18], b: [0.25, 0.95, 0.75] },
};

export const modeIndex = (id: EffectId): number =>
  ({ neural: 0, chrome: 1, glitch: 2, prism: 3, wire: 4 })[id];
