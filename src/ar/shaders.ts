export const armorVertexShader = /* glsl */ `
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

export const armorFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uCharge;

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
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.6);
    float n = noise(vUv * 18.0 + uTime * 0.18);
    float panelX = step(0.91, fract(vUv.x * 13.0 + vUv.y * 2.0));
    float panelY = step(0.92, fract(vUv.y * 17.0));
    float seams = max(panelX, panelY);
    float sweep = smoothstep(0.0, 0.08, abs(vUv.y - (1.05 - uProgress * 1.2)));
    float reveal = smoothstep(0.0, 0.14, uProgress - (1.0 - vUv.y) * 0.75);
    float pulse = 0.65 + 0.35 * sin(uTime * 4.0);

    vec3 crimson = vec3(0.34, 0.012, 0.018);
    vec3 hotRed = vec3(0.95, 0.055, 0.035);
    vec3 titanium = vec3(0.9, 0.62, 0.2);
    vec3 cyan = vec3(0.1, 0.9, 1.0);
    vec3 armor = mix(crimson, hotRed, n * 0.55 + fresnel * 0.65);
    float goldPanel = smoothstep(0.42, 0.62, vUv.y) * (1.0 - smoothstep(0.68, 0.86, abs(vUv.x - 0.5) * 2.0));
    armor = mix(armor, titanium, goldPanel * 0.62);
    armor += seams * mix(titanium, cyan, pulse) * 0.75;
    armor += cyan * fresnel * (0.45 + uCharge);
    armor += cyan * (1.0 - sweep) * 0.9 * step(uProgress, 0.98);

    float eyes = smoothstep(0.09, 0.0, abs(vUv.y - 0.58)) *
      smoothstep(0.34, 0.18, abs(abs(vUv.x - 0.5) - 0.17));
    armor += cyan * eyes * (2.0 + pulse);

    float alpha = reveal * mix(0.78, 0.97, fresnel + seams);
    alpha += eyes * reveal;
    gl_FragColor = vec4(armor, clamp(alpha, 0.0, 0.98));
  }
`;
