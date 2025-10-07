#version 300 es
precision highp float;

in vec2 vUV;                // from vertex shader: pass-through [0,1] UV
out vec4 fragColor;

uniform sampler2D uImgLow;  // image that contributes the low-pass
uniform sampler2D uImgHigh; // image that contributes the high-pass
uniform vec2 uTexSize;      // texture size in pixels of the images (assumed same)
uniform float uSigmaLow;    // Gaussian sigma for low-pass (e.g. 3.0)
uniform float uSigmaHigh;   // Gaussian sigma for high-pass blur (e.g. 2.0)
uniform float uGainLow;     // weight for low-pass (e.g. 1.0)
uniform float uGainHigh;    // weight for high-pass (e.g. 1.0)
uniform bool uGammaCorrect; // if true, do simple gamma linearization (gamma=2.2)

// --- helpers: simple gamma linearization ---
vec3 toLinear(vec3 c)   { return uGammaCorrect ? pow(c, vec3(2.2)) : c; }
vec3 toGamma(vec3 c)    { return uGammaCorrect ? pow(max(c,0.0), vec3(1.0/2.2)) : c; }

// --- Gaussian weights via 1D kernel (separable blur) -------------------------
// We allow a variable radius up to MAX_RADIUS. Kernel is computed on the fly.
// This is fast enough for moderate radii (<= 7) in many real-time contexts.

const int   MAX_RADIUS = 7; // supports sigma up to roughly ~3.0–4.0 comfortably

// Build normalized 1D Gaussian weight at integer offset k for sigma
float g(float k, float sigma) {
    float s2 = sigma * sigma;
    return exp(-0.5 * (k*k) / s2);
}

// Separable Gaussian blur: first horizontal, then vertical.
// For efficiency/readability, we compute weights symmetrically.
vec3 gaussianBlur(sampler2D tex, vec2 uv, vec2 texel, float sigma) {
    int radius = int(min(float(MAX_RADIUS), ceil(3.0 * sigma)));
    if (radius <= 0 || sigma <= 0.0) {
        return texture(tex, uv).rgb;
    }

    // --- horizontal pass ---
    float w0 = g(0.0, sigma);
    float wSum = w0;
    vec3  acc = texture(tex, uv).rgb * w0;

    for (int k = 1; k <= MAX_RADIUS; ++k) {
        if (k > radius) break;
        float wk = g(float(k), sigma);
        vec2  o  = vec2(float(k), 0.0) * texel;
        vec3  c1 = texture(tex, uv + o).rgb;
        vec3  c2 = texture(tex, uv - o).rgb;
        acc += (c1 + c2) * wk;
        wSum += 2.0 * wk;
    }
    vec3 hBlur = acc / wSum;

    // --- vertical pass ---
    // Reuse same sigma/radius vertically on the horizontally blurred sample.
    // (We resample original texture around UV but use the horizontal blur as base.)
    acc   = hBlur * w0;
    wSum  = w0;

    for (int k = 1; k <= MAX_RADIUS; ++k) {
        if (k > radius) break;
        float wk = g(float(k), sigma);
        vec2  o  = vec2(0.0, float(k)) * texel;

        // sample neighbors, but do a cheap "two-pass-in-one" by horizontally
        // blurring the neighbors again; here we approximate by averaging two taps
        // from the original texture around each vertical neighbor's UV.
        // (For stricter correctness, run a true two-pass pipeline.)
        vec3 c1 = texture(tex, uv + o).rgb;
        vec3 c2 = texture(tex, uv - o).rgb;

        acc  += (c1 + c2) * wk;
        wSum += 2.0 * wk;
    }
    return acc / wSum;
}

void main() {
    vec2 texel = 1.0 / uTexSize;

    // Fetch source colors
    vec3 A = toLinear(texture(uImgLow,  vUV).rgb);   // low-pass source
    vec3 B = toLinear(texture(uImgHigh, vUV).rgb);   // high-pass source

    // Low-pass of A
    vec3 A_low = gaussianBlur(uImgLow, vUV, texel, max(uSigmaLow, 0.0));

    // High-pass of B = B - (Gaussian blur of B)
    vec3 B_blur = gaussianBlur(uImgHigh, vUV, texel, max(uSigmaHigh, 0.0));
    vec3 B_high = B - B_blur;

    // Combine (hybrid): low spatial freq from A + high spatial freq from B
    vec3 hybrid = uGainLow * A_low + uGainHigh * B_high;

    // Optional small bias to keep mean intensity stable (uncomment if needed)
    // hybrid += 0.0 * (B_blur - A_low);

    // Back to display space
    fragColor = vec4(toGamma(hybrid), 1.0);
}