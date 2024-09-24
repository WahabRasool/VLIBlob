function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  const canvas = document.createElement('canvas');
  canvas.style.filter = 'saturate(.8) contrast(1.5)'
  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
  });
  document.body.append(canvas);

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  resize();
  window.addEventListener('resize', resize);

  class FlyShape {
    constructor({
      verts = [],
      colors = [],
      sizes = [],
      vert,
      frag,
      indices
    } = {}) {
      Object.assign(this, {
        verts: new Float32Array(verts),
        sizes: new Float32Array(sizes),
        colors: new Float32Array(colors),
        vertexBuffer: gl.createBuffer(),
        indices: indices && new Uint16Array(indices),
        indexBuffer: gl.createBuffer(),
        program: createProgram(
          createShader(gl.VERTEX_SHADER, vert ||
            `
            precision lowp float;
            attribute vec3 position;
            attribute vec4 vertexColor;
            attribute float pointSize; // Use this attribute
            varying vec4 fragColor;
            uniform mat4 flatMatrix;
            void main(void) {
              gl_Position = flatMatrix * vec4(position, 1.0);
              gl_PointSize = pointSize;
              fragColor = vertexColor;
            }
        `),
          createShader(gl.FRAGMENT_SHADER, frag ||
            `
          precision mediump float;
          varying vec4 fragColor;
      void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          float edge = 0.1;  
          float alpha = 1.0 - smoothstep(0.5 - edge, 0.5, dist);
          gl_FragColor = vec4(fragColor.r, fragColor.g, fragColor.b, fragColor.a * alpha);
      }`))
      })

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW)
      if (indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW)
      }

      this.position = gl.getAttribLocation(this.program, 'position')
      gl.enableVertexAttribArray(this.position)
      gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 0, 0)

      this.colorBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(), gl.DYNAMIC_DRAW)

      this.vertexColor = gl.getAttribLocation(this.program, 'vertexColor')
      gl.enableVertexAttribArray(this.vertexColor)
      gl.vertexAttribPointer(this.vertexColor, 4, gl.FLOAT, false, 0, 0)

      this.sizeBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.sizes, gl.STATIC_DRAW)

      this.pointSize = gl.getAttribLocation(this.program, 'pointSize')
      gl.enableVertexAttribArray(this.pointSize)
      gl.vertexAttribPointer(this.pointSize, 1, gl.FLOAT, false, 0, 0)

      this.flatMatrix = gl.getUniformLocation(this.program, 'flatMatrix')
      this.perspective = new DOMMatrix();
    }
    run() {
      gl.useProgram(this.program);
      this.update(this)
    }
    updateBuffers(target) {
      // @TODO consider way to handle index buffers here
      // down the road
      gl.bindBuffer(gl.ARRAY_BUFFER, dots.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, target.points, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(dots.position, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, dots.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, target.colors, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(dots.vertexColor, 4, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, dots.sizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, target.sizes, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(dots.pointSize, 1, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(this.flatMatrix, false, target.perspective
        .toFloat32Array());
    }

    // @TODO in theory this may also be something that
    // can be flyweight
    update(target) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.vertexAttribPointer(target.position, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, target.colors, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(this.vertexColor, 4, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, target.sizes, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(this.pointSize, 1, gl.FLOAT, false, 0, 0);

      gl.uniformMatrix4fv(this.flatMatrix, false, target.perspective
        .toFloat32Array());
    }
    draw() {
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
  }

  const plane = new FlyShape({
    frag: `
           precision lowp float;
            varying vec4 fragColor;
            void main(void) {
              gl_FragColor = fragColor;
            }
          `,
    verts: [
      -1, -1, 0,
      1, -1, 0,
      1, 1, 0,
      -1, 1, 0
    ],
    indices: [0, 1, 2, 0, 2, 3],
    sizes: [0, 0, 0, 0],
    colors: [
      0, 0, 0, .015,
      0, 0, 0, .015,
      0, 0, 0, .015,
      0, 0, 0, .015,
    ]
  })

  const dots = new FlyShape()

  function createPerspectiveMatrix(fov, width, height, near, far, zoom = 1) {
    const aspect = width / height;
    const f = 1.0 / Math.tan(fov / 2) * zoom;
    return new DOMMatrix([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);
  }

  class Shape {
    constructor(p = {}) {
      this.dynamic = false;
      if (p.init) p.init(this);
      if (!this.points) this.points = cube;

      if (!this.colors) {
        this.colors = []
        for (let i = 0; i < this.points.length / 3; i++) {
          this.colors.push(...(this.color || [1.0, 1.0, 1.0, 1.0]));
        }

      }
      this.colors = new Float32Array(this.colors);

      if (!this.sizes) {
        this.sizes = []
        for (let i = 0; i < this.points.length / 3; i++) {
          this.sizes.push(this.size || 5)
        }
      }

      this.sizes = new Float32Array(this.sizes);

      this.animate = p.animate;
      this.matrix = new DOMMatrix();
      this.t = 0;
      Shape.shapes.push(this);

      this.points = new Float32Array(this.points);
      this.startPoints = new Float32Array(this.points);
    }

    run() {
      this?.animate?.(this);
      this.perspective = perspectiveMatrix.multiply(this.matrix)

      dots.updateBuffers(this)

      gl.uniformMatrix4fv(
        dots.flatMatrix, false, this.perspective.toFloat32Array()
      )

      gl.drawArrays(gl.POINTS, 0, this.points.length / 3);
    }
  }
  Shape.shapes = [];

  const shape = o => new Shape(o);

  function rgba(r, g, b, a = .72) {
    return [
      r / 255,
      g / 255,
      b / 255,
      a
    ]
  }
  const colors = [
    rgba(174, 217, 228),
    rgba(0, 146, 214),
    rgba(0, 179, 214),
    rgba(106, 145, 153),
    rgba(42, 170, 250),
    rgba(0, 0, 0, .12),
    rgba(0, 0, 0, .42),
    rgba(0, 0, 0, .52),
    rgba(0, 0, 0, .52),
    rgba(255, 255, 255, .42),
    rgba(255, 255, 255, .42)
  ];

  function makeColor() {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  let G =
    shape({
      init(s) {
        s.points = [];
        s.vels = []
        s.ts = []
        s.tsi = []
        s.xys = []
        s.sizes = []
        s.colors = []

        const m = e => Math.random() * 4 - 2;
        const v = e => Math.random() * .05 - .025;
        const t = e => Math.random() * 7

        s.reset = s => {
          let inc = 0
          let ci = 0

          for (let i = 0; i < 25000; i += 3) {
            s.points[i] = m()
            s.points[i + 1] = m()
            s.points[i + 2] = m()

            let c = makeColor()
            s.colors[ci++] = c[0]
            s.colors[ci++] = c[1]
            s.colors[ci++] = c[2]
            s.colors[ci++] = c[3]

            s.xys[i] = s.points[i]
            s.xys[i + 1] = s.points[i + 1]
            s.xys[i + 2] = s.points[i + 2]

            s.vels[i] = v()
            s.vels[i + 1] = v()
            s.vels[i + 2] = v()

            s.ts[i] = t()
            s.ts[i + 1] = t()
            s.ts[i + 2] = t()

            s.tsi[i] = v()
            s.tsi[i + 1] = v()
            s.tsi[i + 2] = v()

            s.sizes[inc] = 50 * Math.random() * Math.random() * Math
              .random() + 1
            if (Math.random() < 0.001) s.sizes[inc] = 100
            inc++
          }
        }

        s.reset(s)
        s.scl = 1
        s.ds = 1
      },
      animate(s) {
        s.scl += (s.ds - s.scl) / 15

        if (pressed) {
          s.ds += .1
        } else {
          s.ds = 1
        }

        this.matrix = new DOMMatrix()
          .scaleSelf(s.scl, s.scl, s.scl);

        for (let i = 0; i < s.points.length; i += 3) {

          s.xys[i] += s.vels[i]
          s.xys[i + 1] += s.vels[i + 1]
          s.xys[i + 2] += s.vels[i + 2]

          s.points[i] = s.xys[i] + 1 * Math.cos(s.ts[i])
          s.points[i + 1] = s.xys[i + 1] + 1 * Math.sin(s.ts[i + 1])
          s.points[i + 2] = s.xys[i + 2] + 1 * Math.cos(s.ts[i + 2])
          s.ts[i] += s.tsi[i]
          s.ts[i + 1] += s.tsi[i + 1]
          s.ts[i + 2] += s.tsi[i + 2]


        }
      }
    });




  shape({
    init(s) {
      s.points = []
      s.colors = []
      s.sizes = []


      let S = 2.5;
      for (var i = -2; i < 2; i += .04) {
        for (var j = -2; j < 2; j += .04) {
          for (var k = -2; k < 2; k += .04) {
            // blobby, from here www.iiit.net/techreports/ImplicitTR.pdf
            const sc = i * i + j * j + k * k + Math.sin(4 * i) - Math.cos(
              4 * j) + Math.sin(6 * k) - 1;
            if (sc < 0 && sc > -.2) {
              s.points.push(i * S,
                j * S,
                k * S);
              if (s.points.length % 20 == 0) {
                s.colors.push(1, 0, 0, .5)
                s.sizes.push(10)
              } else if (s.points.length % 10 == 0) {
                s.colors.push(0, 0, 0, .5)
                s.sizes.push(10)

              } else {
                s.sizes.push(5)
                let cc = (k + 2 / 4)
                s.colors.push(cc / 2 + .5, cc / 2, cc / 3, .5)
              }

            }
          }
        }
      }

      s.rotate = 0
      s.scale = 1
      s.scaleDest = 1
    },
    animate(s) {
      this.matrix = new DOMMatrix()
        .rotateSelf(s.rotate)
        .scaleSelf(s.scale, s.scale, s.scale)
      s.rotate += 1;

      s.scale += (s.scaleDest - s.scale) / 33

      if (pressed) {
        s.scaleDest = .3
      } else {
        s.scaleDest = 1
      }

    }
  })



  let perspectiveMatrix;
  let camera;

  let mx = 0
  let my = 0
  let pressed = false
  let worldRot = 0;
  let worldRot2 = 0;

  onpointermove = e => {
    mx = e.clientX;
    my = e.clientY;
  };

  onpointerdown = e => {
    if (e.shiftKey) {
      for (let i = 0; i < Shape.shapes.length; i++) {
        let s = Shape.shapes[i];
        s.reset(s)
        //G.init();
      }
      return;
    }
    pressed = true;
  };
  onpointerup = e => {
    pressed = false;
  }

  onresize = e => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };



  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.NOTEQUAL);


  function loop() {
    gl.enable(gl.BLEND)

    // this is very important for transparent shaders
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    )

    plane.run()
    plane.draw()

    gl.useProgram(dots.program);
    perspectiveMatrix = createPerspectiveMatrix(
      Math.PI / 2,
      canvas.width,
      canvas.height,
      0.9,
      20000,
      .5
    );

    camera = new DOMMatrix();
    camera.translateSelf(0, 0, -6)
      .rotateSelf(5, 0, 0)
      .rotateSelf(worldRot2, worldRot, 0);

    worldRot += (mx - worldRot) / 22;
    worldRot2 += (my - worldRot2) / 22;

    perspectiveMatrix.multiplySelf(camera);


    for (let i = 0; i < Shape.shapes.length; i++) {
      Shape.shapes[i].run();
    }


    requestAnimationFrame(loop);
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  loop();