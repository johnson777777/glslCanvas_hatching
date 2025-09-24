// Author: CMH
// Title: Learning Shaders


#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;
uniform sampler2D u_tex1;
uniform sampler2D u_tex2;
uniform sampler2D u_tex3;
uniform sampler2D u_tex4;
uniform sampler2D u_tex5;
uniform sampler2D u_tex6;

float breathing = (exp(sin(u_time*2.0*3.14159/8.0)) - 0.36787944)*0.42545906412;

float mouseEffect(vec2 uv, vec2 mouse, float size) {
    float dist = length(uv - mouse);
    return smoothstep(size, size + 0.2*(breathing + 0.5), dist);
}

float edgeDetection(vec2 uv) {
    vec2 texelSize = 1.0 / u_resolution.xy;
    
    float tl = texture2D(u_tex0, uv + vec2(-texelSize.x, -texelSize.y)).g;
    float tm = texture2D(u_tex0, uv + vec2(0.0, -texelSize.y)).g;
    float tr = texture2D(u_tex0, uv + vec2(texelSize.x, -texelSize.y)).g;
    float ml = texture2D(u_tex0, uv + vec2(-texelSize.x, 0.0)).g;
    float mr = texture2D(u_tex0, uv + vec2(texelSize.x, 0.0)).g;
    float bl = texture2D(u_tex0, uv + vec2(-texelSize.x, texelSize.y)).g;
    float bm = texture2D(u_tex0, uv + vec2(0.0, texelSize.y)).g;
    float br = texture2D(u_tex0, uv + vec2(texelSize.x, texelSize.y)).g;
    
    float sobelX = -1.0 * tl + 1.0 * tr +
                   -2.0 * ml + 2.0 * mr +
                   -1.0 * bl + 1.0 * br;
    
    float sobelY = -1.0 * tl - 2.0 * tm - 1.0 * tr +
                    1.0 * bl + 2.0 * bm + 1.0 * br;
    
    return sqrt(sobelX * sobelX + sobelY * sobelY);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    float aspect = u_resolution.x / u_resolution.y;
    vec2 correctedUV = uv;
    if (aspect > 1.0) {
        correctedUV.x = (uv.x - 0.5) * aspect + 0.5;
    } else {
        correctedUV.y = (uv.y - 0.5) / aspect + 0.5;
    }
    
    bool inBounds = correctedUV.x >= 0.0 && correctedUV.x <= 1.0 && 
                    correctedUV.y >= 0.0 && correctedUV.y <= 1.0;
    
    vec2 vUv = fract(6.0 * correctedUV);
    vec4 shadeColor = texture2D(u_tex0, correctedUV);
    float shading = shadeColor.g;
    vec2 mouse = u_mouse.xy / u_resolution.xy;
    
    vec2 correctedMouse = mouse;
    if (aspect > 1.0) {
        correctedMouse.x = (mouse.x - 0.5) * aspect + 0.5;
    } else {
        correctedMouse.y = (mouse.y - 0.5) / aspect + 0.5;
    }
    
    float value = mouseEffect(correctedUV, correctedMouse, 0.05);
    
    float edge = edgeDetection(correctedUV);
    
    float angle = edge * 3.14159 * 4.0 + u_time;
    vec2 rotatedUV = vec2(
        vUv.x * cos(angle) - vUv.y * sin(angle),
        vUv.x * sin(angle) + vUv.y * cos(angle)
    );
    rotatedUV = fract(rotatedUV);
    
    vec2 finalUV = mix(vUv, rotatedUV, edge * 2.0);
    
    vec4 c;
    float step = 1.0 / 6.0;
    
    if (shading <= step) {   
        c = mix(texture2D(u_tex6, finalUV), texture2D(u_tex5, finalUV), 6.0 * shading);
    }
    else if (shading > step && shading <= 2.0 * step) {
        c = mix(texture2D(u_tex5, finalUV), texture2D(u_tex4, finalUV), 6.0 * (shading - step));
    }
    else if (shading > 2.0 * step && shading <= 3.0 * step) {
        c = mix(texture2D(u_tex4, finalUV), texture2D(u_tex3, finalUV), 6.0 * (shading - 2.0 * step));
    }
    else if (shading > 3.0 * step && shading <= 4.0 * step) {
        c = mix(texture2D(u_tex3, finalUV), texture2D(u_tex2, finalUV), 6.0 * (shading - 3.0 * step));
    }
    else if (shading > 4.0 * step && shading <= 5.0 * step) {
        c = mix(texture2D(u_tex2, finalUV), texture2D(u_tex1, finalUV), 6.0 * (shading - 4.0 * step));
    }
    else {
        c = mix(texture2D(u_tex1, finalUV), vec4(1.0), 6.0 * (shading - 5.0 * step));
    }
    
    vec3 edgeColor = vec3(1.0, 0.3, 0.1) * edge * 2.0;
    c.rgb += edgeColor;
    
    vec4 inkColor = vec4(0.1, 0.2, 0.8, 1.0);
    vec4 src = mix(mix(inkColor, vec4(1.0), c.r), c, 0.5);
    vec4 mixColor = mix(shadeColor, src, value);
    
    vec4 finalColor = inBounds ? mixColor : vec4(1.0, 1.0, 1.0, 1.0);
    
    gl_FragColor = finalColor;
}