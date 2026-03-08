const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_source;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;

varying vec2 v_uv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.07;
    amplitude *= 0.52;
  }
  return value;
}

void main() {
  vec2 uv = v_uv;
  vec2 px = 1.0 / max(u_resolution, vec2(1.0));
  float time = u_time * 0.34;

  float fieldA = fbm((uv * 4.2) + vec2(time * 0.65, -time * 0.45));
  float fieldB = fbm((uv * 7.1) + vec2(-time * 0.40, time * 0.52));
  vec2 pointerDelta = uv - u_pointer;
  float pointerDistance = length(pointerDelta);
  float pointerMask = smoothstep(0.42, 0.02, 0.42 - pointerDistance);

  vec2 distortion = vec2(fieldA - 0.5, fieldB - 0.5) * 0.032;
  distortion += vec2(
    sin((uv.y + time) * 8.0) * 0.010,
    cos((uv.x - time) * 8.6) * 0.010
  );
  distortion -= pointerDelta * pointerMask * 0.10;

  vec2 refractUv = clamp(uv + distortion, 0.001, 0.999);

  vec4 base = texture2D(u_source, refractUv) * 0.52;
  base += texture2D(u_source, clamp(refractUv + (distortion * 0.75) + vec2(px.x * 6.0, 0.0), 0.001, 0.999)) * 0.16;
  base += texture2D(u_source, clamp(refractUv - (distortion * 0.75) - vec2(px.x * 6.0, 0.0), 0.001, 0.999)) * 0.16;
  base += texture2D(u_source, clamp(refractUv + vec2(0.0, px.y * 7.0), 0.001, 0.999)) * 0.08;
  base += texture2D(u_source, clamp(refractUv - vec2(0.0, px.y * 7.0), 0.001, 0.999)) * 0.08;

  float edge = smoothstep(0.82, 0.14, distance(uv, vec2(0.5)));
  float fresnel = pow(1.0 - edge, 2.0);
  float spec = pow(max(0.0, 1.0 - (pointerDistance * 2.4)), 3.5);
  float sheen = smoothstep(0.10, 0.66, uv.y) * 0.13;

  vec3 tint = mix(vec3(0.95, 0.98, 1.02), vec3(1.0), fieldA * 0.5 + 0.5);
  vec3 finalColor = (base.rgb * tint);
  finalColor += vec3(0.16, 0.20, 0.28) * fresnel * 0.24;
  finalColor += vec3(1.0) * spec * 0.17;
  finalColor += vec3(1.0) * sheen;

  gl_FragColor = vec4(finalColor, 0.92);
}
`;

function createNoopRenderer(error = null) {
  return {
    ready: false,
    error,
    render() {},
    resize() {},
    destroy() {},
  };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to allocate shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("Unable to allocate shader program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || "Unknown program link error.";
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(info);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createBootLiquidRenderer({ canvas, sourceCanvas }) {
  if (!canvas || !sourceCanvas) {
    return createNoopRenderer();
  }

  let gl = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.warn("[BMS] Boot liquid context creation failed:", error);
    return createNoopRenderer(error);
  }

  if (!gl) {
    return createNoopRenderer(new Error("WebGL unavailable for boot liquid card."));
  }

  const captureCanvas = document.createElement("canvas");
  const captureCtx = captureCanvas.getContext("2d", { alpha: true, willReadFrequently: false });
  if (!captureCtx) {
    return createNoopRenderer(new Error("2D capture context unavailable for boot liquid card."));
  }

  let program;
  let positionBuffer;
  let texture;

  try {
    program = createProgram(gl);

    positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      throw new Error("Unable to allocate boot liquid vertex buffer.");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );

    texture = gl.createTexture();
    if (!texture) {
      throw new Error("Unable to allocate boot liquid source texture.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
  } catch (error) {
    console.warn("[BMS] Boot liquid initialization failed:", error);
    return createNoopRenderer(error);
  }

  const attribLocation = gl.getAttribLocation(program, "a_position");
  const uniforms = {
    source: gl.getUniformLocation(program, "u_source"),
    resolution: gl.getUniformLocation(program, "u_resolution"),
    pointer: gl.getUniformLocation(program, "u_pointer"),
    time: gl.getUniformLocation(program, "u_time"),
  };

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(attribLocation);
  gl.vertexAttribPointer(attribLocation, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);

  const state = {
    destroyed: false,
    pointerX: 0.5,
    pointerY: 0.5,
    targetPointerX: 0.5,
    targetPointerY: 0.5,
    lastPointerAt: 0,
  };

  function getRect() {
    return canvas.getBoundingClientRect();
  }

  function updatePointerTarget(clientX, clientY) {
    const rect = getRect();
    if (!(rect.width > 0) || !(rect.height > 0)) {
      return;
    }

    state.targetPointerX = clamp((clientX - rect.left) / rect.width, 0, 1);
    state.targetPointerY = clamp(1 - ((clientY - rect.top) / rect.height), 0, 1);
    state.lastPointerAt = performance.now();
  }

  function handlePointerMove(event) {
    updatePointerTarget(event.clientX, event.clientY);
  }

  function handleTouchMove(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) {
      return;
    }
    updatePointerTarget(touch.clientX, touch.clientY);
  }

  function handlePointerExit() {
    state.lastPointerAt = 0;
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerleave", handlePointerExit, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("touchend", handlePointerExit, { passive: true });
  window.addEventListener("touchcancel", handlePointerExit, { passive: true });

  function resize() {
    if (state.destroyed) {
      return;
    }

    const rect = getRect();
    const cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || canvas.clientHeight || 1));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.0);
    const width = Math.max(1, Math.round(cssWidth * pixelRatio));
    const height = Math.max(1, Math.round(cssHeight * pixelRatio));

    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    captureCanvas.width = width;
    captureCanvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  function updatePointer(nowMs) {
    const idle = !state.lastPointerAt || (nowMs - state.lastPointerAt) > 1800;
    let targetX = state.targetPointerX;
    let targetY = state.targetPointerY;
    if (idle) {
      targetX = 0.5 + (Math.sin(nowMs * 0.00035) * 0.10);
      targetY = 0.52 + (Math.cos(nowMs * 0.00028) * 0.08);
    }

    state.pointerX += (targetX - state.pointerX) * 0.12;
    state.pointerY += (targetY - state.pointerY) * 0.12;
  }

  function uploadCardCapture() {
    const rect = getRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const sourceWidth = sourceCanvas.width || 0;
    const sourceHeight = sourceCanvas.height || 0;

    if (!(rect.width > 0) || !(rect.height > 0) || !(sourceWidth > 0) || !(sourceHeight > 0)) {
      return false;
    }

    const sx = clamp((rect.left / viewportWidth) * sourceWidth, 0, sourceWidth - 1);
    const sy = clamp((rect.top / viewportHeight) * sourceHeight, 0, sourceHeight - 1);
    const sw = clamp((rect.width / viewportWidth) * sourceWidth, 1, sourceWidth - sx);
    const sh = clamp((rect.height / viewportHeight) * sourceHeight, 1, sourceHeight - sy);

    captureCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
    captureCtx.drawImage(
      sourceCanvas,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      captureCanvas.width,
      captureCanvas.height,
    );

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, captureCanvas);
    return true;
  }

  function render(nowMs = performance.now()) {
    if (state.destroyed) {
      return;
    }

    if (!uploadCardCapture()) {
      return;
    }

    updatePointer(nowMs);

    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.source, 0);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, state.pointerX, state.pointerY);
    gl.uniform1f(uniforms.time, nowMs * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function destroy() {
    if (state.destroyed) {
      return;
    }

    state.destroyed = true;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerleave", handlePointerExit);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handlePointerExit);
    window.removeEventListener("touchcancel", handlePointerExit);

    if (texture) {
      gl.deleteTexture(texture);
    }
    if (positionBuffer) {
      gl.deleteBuffer(positionBuffer);
    }
    if (program) {
      gl.deleteProgram(program);
    }
  }

  resize();

  return {
    ready: true,
    error: null,
    render,
    resize,
    destroy,
  };
}
