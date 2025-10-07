// Author: CMH
// Title: Image Processing Pipeline - Low-pass Filter Showcase

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_frame;
uniform sampler2D u_tex0;  // First image (in.png)
uniform sampler2D u_tex1;  // Second image (out.png)
uniform sampler2D u_buffer0; // Frame buffer for recursive blur

// Low-pass filter (Gaussian blur) function - unrolled for WebGL compatibility
vec3 applyLowPassFilter(sampler2D tex, vec2 uv, vec2 texelSize, float intensity) {
    vec3 result = vec3(0.0);
    
    // Manual 5x5 Gaussian blur unrolled
    result += texture2D(tex, uv + vec2(-2.0, -2.0) * texelSize * intensity).rgb * (1.0/273.0);
    result += texture2D(tex, uv + vec2(-1.0, -2.0) * texelSize * intensity).rgb * (4.0/273.0);
    result += texture2D(tex, uv + vec2( 0.0, -2.0) * texelSize * intensity).rgb * (7.0/273.0);
    result += texture2D(tex, uv + vec2( 1.0, -2.0) * texelSize * intensity).rgb * (4.0/273.0);
    result += texture2D(tex, uv + vec2( 2.0, -2.0) * texelSize * intensity).rgb * (1.0/273.0);
    
    result += texture2D(tex, uv + vec2(-2.0, -1.0) * texelSize * intensity).rgb * (4.0/273.0);
    result += texture2D(tex, uv + vec2(-1.0, -1.0) * texelSize * intensity).rgb * (16.0/273.0);
    result += texture2D(tex, uv + vec2( 0.0, -1.0) * texelSize * intensity).rgb * (26.0/273.0);
    result += texture2D(tex, uv + vec2( 1.0, -1.0) * texelSize * intensity).rgb * (16.0/273.0);
    result += texture2D(tex, uv + vec2( 2.0, -1.0) * texelSize * intensity).rgb * (4.0/273.0);
    
    result += texture2D(tex, uv + vec2(-2.0,  0.0) * texelSize * intensity).rgb * (7.0/273.0);
    result += texture2D(tex, uv + vec2(-1.0,  0.0) * texelSize * intensity).rgb * (26.0/273.0);
    result += texture2D(tex, uv + vec2( 0.0,  0.0) * texelSize * intensity).rgb * (41.0/273.0);
    result += texture2D(tex, uv + vec2( 1.0,  0.0) * texelSize * intensity).rgb * (26.0/273.0);
    result += texture2D(tex, uv + vec2( 2.0,  0.0) * texelSize * intensity).rgb * (7.0/273.0);
    
    result += texture2D(tex, uv + vec2(-2.0,  1.0) * texelSize * intensity).rgb * (4.0/273.0);
    result += texture2D(tex, uv + vec2(-1.0,  1.0) * texelSize * intensity).rgb * (16.0/273.0);
    result += texture2D(tex, uv + vec2( 0.0,  1.0) * texelSize * intensity).rgb * (26.0/273.0);
    result += texture2D(tex, uv + vec2( 1.0,  1.0) * texelSize * intensity).rgb * (16.0/273.0);
    result += texture2D(tex, uv + vec2( 2.0,  1.0) * texelSize * intensity).rgb * (4.0/273.0);
    
    result += texture2D(tex, uv + vec2(-2.0,  2.0) * texelSize * intensity).rgb * (1.0/273.0);
    result += texture2D(tex, uv + vec2(-1.0,  2.0) * texelSize * intensity).rgb * (4.0/273.0);
    result += texture2D(tex, uv + vec2( 0.0,  2.0) * texelSize * intensity).rgb * (7.0/273.0);
    result += texture2D(tex, uv + vec2( 1.0,  2.0) * texelSize * intensity).rgb * (4.0/273.0);
    result += texture2D(tex, uv + vec2( 2.0,  2.0) * texelSize * intensity).rgb * (1.0/273.0);
    
    return result;
}

// Simpler 3x3 low-pass filter for frame buffer feedback - unrolled
vec3 applySimpleLowPass(sampler2D tex, vec2 uv, vec2 texelSize) {
    vec3 result = vec3(0.0);
    
    // Manual 3x3 Gaussian blur unrolled
    result += texture2D(tex, uv + vec2(-1.0, -1.0) * texelSize).rgb * (1.0/16.0);
    result += texture2D(tex, uv + vec2( 0.0, -1.0) * texelSize).rgb * (2.0/16.0);
    result += texture2D(tex, uv + vec2( 1.0, -1.0) * texelSize).rgb * (1.0/16.0);
    
    result += texture2D(tex, uv + vec2(-1.0,  0.0) * texelSize).rgb * (2.0/16.0);
    result += texture2D(tex, uv + vec2( 0.0,  0.0) * texelSize).rgb * (4.0/16.0);
    result += texture2D(tex, uv + vec2( 1.0,  0.0) * texelSize).rgb * (2.0/16.0);
    
    result += texture2D(tex, uv + vec2(-1.0,  1.0) * texelSize).rgb * (1.0/16.0);
    result += texture2D(tex, uv + vec2( 0.0,  1.0) * texelSize).rgb * (2.0/16.0);
    result += texture2D(tex, uv + vec2( 1.0,  1.0) * texelSize).rgb * (1.0/16.0);
    
    return result;
}

// Extra strong blur for extreme low-pass filtering
vec3 applyStrongBlur(sampler2D tex, vec2 uv, vec2 texelSize, float intensity) {
    vec3 result = vec3(0.0);
    float totalWeight = 0.0;
    
    // 7x7 blur kernel with larger radius
    for (float y = -3.0; y <= 3.0; y += 1.0) {
        for (float x = -3.0; x <= 3.0; x += 1.0) {
            vec2 offset = vec2(x, y) * texelSize * intensity;
            float weight = exp(-(x*x + y*y) / 8.0); // Gaussian falloff
            result += texture2D(tex, uv + offset).rgb * weight;
            totalWeight += weight;
        }
    }
    
    return result / totalWeight;
}

// High-pass filter function
vec3 applyHighPassFilter(sampler2D tex, vec2 uv, vec2 texelSize, float intensity) {
    // Get original image
    vec3 original = texture2D(tex, uv).rgb;
    
    // Apply low-pass filter (same as we used before but simpler)
    vec3 lowpass = vec3(0.0);
    lowpass += texture2D(tex, uv + vec2(-1.0, -1.0) * texelSize * intensity).rgb * (1.0/16.0);
    lowpass += texture2D(tex, uv + vec2( 0.0, -1.0) * texelSize * intensity).rgb * (2.0/16.0);
    lowpass += texture2D(tex, uv + vec2( 1.0, -1.0) * texelSize * intensity).rgb * (1.0/16.0);
    lowpass += texture2D(tex, uv + vec2(-1.0,  0.0) * texelSize * intensity).rgb * (2.0/16.0);
    lowpass += texture2D(tex, uv + vec2( 0.0,  0.0) * texelSize * intensity).rgb * (4.0/16.0);
    lowpass += texture2D(tex, uv + vec2( 1.0,  0.0) * texelSize * intensity).rgb * (2.0/16.0);
    lowpass += texture2D(tex, uv + vec2(-1.0,  1.0) * texelSize * intensity).rgb * (1.0/16.0);
    lowpass += texture2D(tex, uv + vec2( 0.0,  1.0) * texelSize * intensity).rgb * (2.0/16.0);
    lowpass += texture2D(tex, uv + vec2( 1.0,  1.0) * texelSize * intensity).rgb * (1.0/16.0);
    
    // High-pass = Original - Low-pass
    vec3 highpass = original - lowpass;
    
    // Amplify and clamp the high-pass result
    highpass = clamp(highpass * 2.0 + 0.5, 0.0, 1.0);
    
    return highpass;
}

// Edge enhancement filter for stronger high-pass effect
vec3 applyEdgeEnhancement(sampler2D tex, vec2 uv, vec2 texelSize, float intensity) {
    // Sobel edge detection kernels
    vec3 result = vec3(0.0);
    
    // Horizontal Sobel
    vec3 gx = vec3(0.0);
    gx += texture2D(tex, uv + vec2(-1.0, -1.0) * texelSize * intensity).rgb * (-1.0);
    gx += texture2D(tex, uv + vec2( 0.0, -1.0) * texelSize * intensity).rgb * (-2.0);
    gx += texture2D(tex, uv + vec2( 1.0, -1.0) * texelSize * intensity).rgb * (-1.0);
    gx += texture2D(tex, uv + vec2(-1.0,  1.0) * texelSize * intensity).rgb * (1.0);
    gx += texture2D(tex, uv + vec2( 0.0,  1.0) * texelSize * intensity).rgb * (2.0);
    gx += texture2D(tex, uv + vec2( 1.0,  1.0) * texelSize * intensity).rgb * (1.0);
    
    // Vertical Sobel
    vec3 gy = vec3(0.0);
    gy += texture2D(tex, uv + vec2(-1.0, -1.0) * texelSize * intensity).rgb * (-1.0);
    gy += texture2D(tex, uv + vec2(-1.0,  0.0) * texelSize * intensity).rgb * (-2.0);
    gy += texture2D(tex, uv + vec2(-1.0,  1.0) * texelSize * intensity).rgb * (-1.0);
    gy += texture2D(tex, uv + vec2( 1.0, -1.0) * texelSize * intensity).rgb * (1.0);
    gy += texture2D(tex, uv + vec2( 1.0,  0.0) * texelSize * intensity).rgb * (2.0);
    gy += texture2D(tex, uv + vec2( 1.0,  1.0) * texelSize * intensity).rgb * (1.0);
    
    // Combine gradients
    result = sqrt(gx * gx + gy * gy);
    return clamp(result, 0.0, 1.0);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 texel = 1.0 / u_resolution.xy;
    
    // Mouse interaction for blur intensity
    vec2 mouse = u_mouse.xy / u_resolution.xy;
    float blurIntensity = mouse.x * 8.0 + 1.0; // Range from 1.0 to 9.0 (much stronger)
    
    // Step A: Load first image and apply low-pass filter
    vec3 originalImage = texture2D(u_tex0, st).rgb;
    vec3 blurredImage = applyLowPassFilter(u_tex0, st, texel, blurIntensity);
    
    // Apply even stronger blur when mouse is in right half
    if (mouse.x > 0.5) {
        vec3 strongBlur = applyStrongBlur(u_tex0, st, texel, blurIntensity * 0.8);
        blurredImage = mix(blurredImage, strongBlur, 0.6);
    }
    
    // Step B: Recursive frame buffer for enhanced blur
    vec3 bufferBlur = vec3(0.0);
    if (u_frame > 0.0) {
        // Use previous frame buffer and apply additional blur
        bufferBlur = applySimpleLowPass(u_buffer0, st, texel * 2.0); // Double the blur radius
        // Mix with current blur for temporal accumulation
        float feedbackStrength = 0.9; // Stronger feedback for more accumulation
        blurredImage = mix(blurredImage, bufferBlur, feedbackStrength);
    }
    
    // Apply multiple passes for even stronger blur
    vec3 extraBlur = applySimpleLowPass(u_tex0, st, texel * blurIntensity * 1.5);
    blurredImage = mix(blurredImage, extraBlur, 0.3);
    
    // Step C: Load second image and apply high-pass filter
    vec3 originalImage2 = texture2D(u_tex1, st).rgb;
    float highpassIntensity = mouse.y * 4.0 + 0.5; // Mouse Y controls high-pass intensity
    vec3 highpassImage = applyHighPassFilter(u_tex1, st, texel, highpassIntensity);
    
    // Apply edge enhancement for stronger high-pass effect
    if (mouse.y > 0.6) {
        vec3 edgeEnhanced = applyEdgeEnhancement(u_tex1, st, texel, highpassIntensity * 0.5);
        highpassImage = mix(highpassImage, edgeEnhanced, 0.4);
    }
    
    // Step D: Combine the two filtered images and fine-tune the result
    vec3 combinedResult = vec3(0.0);
    
    // Different combination modes based on mouse position
    float combineMode = mouse.x + mouse.y; // Range 0.0 to 2.0
    
    if (combineMode < 0.5) {
        // Mode 1: Simple addition
        combinedResult = clamp(blurredImage + highpassImage * 0.5, 0.0, 1.0);
    } else if (combineMode < 1.0) {
        // Mode 2: Overlay blend
        combinedResult = mix(blurredImage, highpassImage, 0.3);
        combinedResult = blurredImage + (highpassImage - 0.5) * 0.8;
        combinedResult = clamp(combinedResult, 0.0, 1.0);
    } else if (combineMode < 1.5) {
        // Mode 3: Detail enhancement
        combinedResult = blurredImage + (highpassImage - 0.5) * 1.2;
        combinedResult = clamp(combinedResult, 0.0, 1.0);
    } else {
        // Mode 4: Artistic blend with color enhancement
        vec3 colorBoost = pow(blurredImage, vec3(0.8)); // Gamma adjustment
        combinedResult = colorBoost + highpassImage * 0.6;
        combinedResult = clamp(combinedResult, 0.0, 1.0);
    }
    
    // Fine-tuning based on time for dynamic effects
    float timeModulation = sin(u_time * 0.5) * 0.1 + 0.9;
    combinedResult *= timeModulation;
    
    // Final result visualization - Full screen combined result
    vec3 finalColor = combinedResult;
    
    // Add some visual feedback for mouse interaction
    if (length(st - mouse) < 0.02) {
        finalColor = mix(finalColor, vec3(1.0, 0.0, 0.0), 0.5); // Red dot at mouse
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}