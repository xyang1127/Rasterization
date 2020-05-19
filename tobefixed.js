/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles2.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!

var triBufferSize = 0; // the number of indices in the triangle buffer
var shaderProgram;

var vertexBuffers = [];
var triangleBuffers = [];
var ambientBuffers = [];
var diffuseBuffers = [];
var specularBuffers = [];
var normalBuffers = [];
var factorBuffers = [];
var bufferSize = [];

// var vertexPositionAttrib
// var ambientAttrib;
// var diffuseAttrib;
// var specularAttrib;
// var normalAttrib;
// var factorAttrib;

var lightPosition = new vec3.fromValues(0.5, 0.5, 0.05);

var eyePosition = new vec3.fromValues(0.5, 0.5, -0.5);
var lookCenter = new vec3.fromValues(0.5, 0.5, 0);
var lookUp = new vec3.fromValues(0, 1, 0);
var viewingMat = mat4.create();
mat4.lookAt(viewingMat, eyePosition, lookCenter, lookUp);
var perspectiveMat = mat4.create();
mat4.perspective(perspectiveMat, Math.PI/2, 1, 0.5, 100.0);
var modifyMat = mat4.create();

var eyePositionUniform;
var lightPositionUniform;
var viewingMatUniform;
var perspectiveMatUniform;
var modifyMatUniform;

function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
}

function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
}

function loadTriangles() {
    // var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    var inputTriangles =  [ {
        "material": {"ambient": [0.1,0.1,0.1], "diffuse": [0.0,0.0,0.6], "specular": [0.3,0.3,0.3], "n":40, "alpha": 0.7, "texture": "billie.jpg"}, 
        "vertices": [[0.4, 0.65, 0.75],[0.4, 0.85, 0.65],[0.6,0.85,0.75],[0.6,0.65,0.85]],
        "normals": [[0, 0, -1],[0, 0, -1],[0, 0,-1],[0, 0,-1]],
        "uvs": [[0,0], [0,1], [1,1], [1,0]],
        "triangles": [[0,1,2],[2,3,0]]
      },
      {
        "material": {"ambient": [0.1,0.1,0.1], "diffuse": [0.0,0.6,0.0], "specular": [0.3,0.3,0.3], "n":15, "alpha": 0.5, "texture": false}, 
        "vertices": [[0.65, 0.4, 0.45],[0.75, 0.6, 0.45],[0.85,0.4,0.45]],
        "normals": [[0, 0, -1],[0, 0,-1],[0, 0,-1]],
        "uvs": [[0,0], [0.5,1], [1,0]],
        "triangles": [[0,1,2]]
      },
      {
        "material": {"ambient": [0.1,0.1,0.1], "diffuse": [0.4,0.6,0.1], "specular": [0.3,0.3,0.3], "n":17, "alpha": 0.3, "texture": "tree.png"}, 
        "vertices": [[0.4, 0.15, 0.35],[0.4, 0.35, 0.65],[0.6,0.35,0.75],[0.6,0.15,0.45]],
        "normals": [[0, 0, -1],[0, 0, -1],[0, 0, -1],[0, 0, -1]],
        "uvs": [[0,0], [0,1], [1,1], [1,0]],
        "triangles": [[0,1,2],[2,3,0]]
      },
       {
        "material": {"ambient": [0.1,0.1,0.1], "diffuse": [0.1,0.6,0.4], "specular": [0.3,0.3,0.3], "n":17, "alpha": 0.3, "texture": "tree.png"}, 
        "vertices": [[0.00, 0.30, 0.75],[0.0, 0.50, 0.75],[0.2,0.5,0.75],[0.2,0.30,0.75]],
        "normals": [[0, 0, -1],[0, 0, -1],[0, 0, -1],[0, 0, -1]],
        "uvs": [[0,0], [0,1], [1,1], [1,0]],
        "triangles": [[0,1,2],[2,3,0]]
      }
      ]

    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array

        var ambients = [];
        var diffuses = [];
        var speculars = [];
        var normals = [];
        var factors = [];
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            
            var ambientToAdd = inputTriangles[whichSet].material.ambient;
            var diffuseToAdd = inputTriangles[whichSet].material.diffuse;
            var specularToAdd = inputTriangles[whichSet].material.specular;
            var factorToAdd = inputTriangles[whichSet].material.n;

            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);

                ambients.push(ambientToAdd[0], ambientToAdd[1], ambientToAdd[2]);
                diffuses.push(diffuseToAdd[0], diffuseToAdd[1], diffuseToAdd[2]);
                speculars.push(specularToAdd[0], specularToAdd[1], specularToAdd[2]);
                factors.push(factorToAdd);

                var normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                normals.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);
            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            // send the vertex coords to webGL
            var vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
            gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
            vertexBuffers.push(vertexBuffer);

            var ambientBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambients),gl.STATIC_DRAW);
            ambientBuffers.push(ambientBuffer);

            var diffuseBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diffuses),gl.STATIC_DRAW);
            diffuseBuffers.push(diffuseBuffer);

            var specularBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(speculars),gl.STATIC_DRAW);
            specularBuffers.push(specularBuffer);

            var normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals),gl.STATIC_DRAW);
            normalBuffers.push(normalBuffer);

            var factorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,factorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(factors),gl.STATIC_DRAW);
            factorBuffers.push(factorBuffer);

            // send the triangle indices to webGL
            var triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
            triangleBuffers.push(triangleBuffer);

            bufferSize.push(inputTriangles[whichSet].triangles.length * 3);

        } // end for each triangle set 

    } // end if triangles found
}

function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        varying mediump vec3 flightPosition;
        varying mediump vec3 feyePosition;
        varying mediump vec3 fvertexPosition;
        varying mediump vec3 fvertexNormal;

        varying mediump vec3 fambient;
        varying mediump vec3 fdiffuse;
        varying mediump vec3 fspecular;
        varying mediump float ffactor;
        
        void main(void) {
            mediump vec3 N = fvertexNormal;
            mediump vec3 V = normalize(feyePosition - fvertexPosition);
            mediump vec3 L = normalize(flightPosition - fvertexPosition);
            mediump vec3 H = normalize(L + V);

            mediump float diffuseCo = dot(N, L);
            mediump float specularCo = pow(dot(N, H), ffactor);

            mediump float r = fambient[0] + max(0.0, fdiffuse[0] * diffuseCo) + max(0.0, fspecular[0] * specularCo);
            mediump float g = fambient[1] + max(0.0, fdiffuse[1] * diffuseCo) + max(0.0, fspecular[1] * specularCo);
            mediump float b = fambient[2] + max(0.0, fdiffuse[2] * diffuseCo) + max(0.0, fspecular[2] * specularCo);

            gl_FragColor = vec4(r, g, b, 1.0);
            // gl_FragColor = vec4(1, 0, 0, 1);
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        
        uniform vec3 lightPosition;
        uniform vec3 eyePosition;

        uniform mat4 viewingMat;
        uniform mat4 perspectiveMat;
        uniform mat4 modifyMat;

        attribute vec3 vertexPosition;
        attribute vec3 ambient;
        attribute vec3 diffuse;
        attribute vec3 specular;
        attribute vec3 vertexNormal;
        attribute float factor;

        varying mediump vec3 flightPosition;
        varying mediump vec3 feyePosition;
        varying mediump vec3 fvertexPosition;
        varying mediump vec3 fvertexNormal;

        varying mediump vec3 fambient;
        varying mediump vec3 fdiffuse;
        varying mediump vec3 fspecular;
        varying mediump float ffactor;

        void main(void) {

            vec4 originalCoor = vec4(vertexPosition, 1);
            vec4 modifyCoor = modifyMat * originalCoor; 
            vec4 eyeCoor = viewingMat * modifyCoor;
            vec4 pesCoor = perspectiveMat * eyeCoor;

            gl_Position = pesCoor;

            // pass parameters to fragment shader
            flightPosition = lightPosition;
            feyePosition = eyePosition;
            fvertexPosition = vertexPosition;
            fvertexNormal = vertexNormal;
            
            fambient = ambient;
            fdiffuse = diffuse;
            fspecular = specular;
            ffactor = factor;

        }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                // ------------------------------------------------------------------------------------
                // vertexPositionAttrib = // get pointer to vertex shader input
                //     gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                // gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                
                // ambientAttrib = gl.getAttribLocation(shaderProgram, "ambient");
                // gl.enableVertexAttribArray(ambientAttrib);

                // diffuseAttrib = gl.getAttribLocation(shaderProgram, "diffuse");
                // gl.enableVertexAttribArray(diffuseAttrib);

                // specularAttrib = gl.getAttribLocation(shaderProgram, "specular");
                // gl.enableVertexAttribArray(specularAttrib);

                // normalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal");
                // gl.enableVertexAttribArray(normalAttrib);

                // factorAttrib = gl.getAttribLocation(shaderProgram, "factor");
                // gl.enableVertexAttribArray(factorAttrib);

                shaderProgram.vertexPosition = gl.getAttribLocation(shaderProgram, "vertexPosition");
                shaderProgram.ambient = gl.getAttribLocation(shaderProgram, "ambient");
                shaderProgram.diffuse = gl.getAttribLocation(shaderProgram, "diffuse");
                shaderProgram.specular = gl.getAttribLocation(shaderProgram, "specular");
                shaderProgram.vertexNormal = gl.getAttribLocation(shaderProgram, "vertexNormal");
                shaderProgram.factor = gl.getAttribLocation(shaderProgram, "factor");


                eyePositionUniform = gl.getUniformLocation(shaderProgram, "eyePosition");
                lightPositionUniform = gl.getUniformLocation(shaderProgram, "lightPosition");
                viewingMatUniform = gl.getUniformLocation(shaderProgram, "viewingMat");
                perspectiveMatUniform = gl.getUniformLocation(shaderProgram, "perspectiveMat");
                modifyMatUniform = gl.getUniformLocation(shaderProgram, "modifyMat");

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
}

function handleKeyDown(event) {
    
}

function handleKeyPress(event) {

    var delta = 0.03;
    
    switch (event.charCode) {
        // a   translate view left along view X
        case 97:
            eyePosition[0] += delta;
            lookCenter[0] += delta;
            break;
        // d   translate view right along view X
        case 100:
            eyePosition[0] -= delta;
            lookCenter[0] -= delta;
            break;
        case 119:
            eyePosition[2] += delta;
            lookCenter[2] += delta;
            break;
        case 115:
            eyePosition[2] -= delta;
            lookCenter[2] -= delta;
            break;
        case 113:
            eyePosition[1] += delta;
            lookCenter[1] += delta;
            break;
        case 101:
            eyePosition[1] -= delta;
            lookCenter[1] -= delta;
            break;
        case 65:
            lookCenter[0] += delta;
            break;
        case 68:
            lookCenter[0] -= delta;
            break;
        case 87:
            lookCenter[1] += delta;
            break;
        case 83:
            lookCenter[1] -= delta;
            break;
        
    }

    requestAnimationFrame(renderTriangles);
}

function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    mat4.lookAt(viewingMat, eyePosition, lookCenter, lookUp);
    mat4.perspective(perspectiveMat, Math.PI/2, 1, 0.5, 100.0);

    gl.uniform3fv(eyePositionUniform, eyePosition);
    gl.uniform3fv(lightPositionUniform, lightPosition);
    gl.uniformMatrix4fv(viewingMatUniform, false, viewingMat);
    gl.uniformMatrix4fv(perspectiveMatUniform, false, perspectiveMat);
    gl.uniformMatrix4fv(modifyMatUniform, false, modifyMat);

    var l = vertexBuffers.length;

    for (var whichSet=0; whichSet<l; whichSet++) {

        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate
        gl.vertexAttribPointer(shaderProgram.vertexPosition,3,gl.FLOAT,false,0,0); // feed
        gl.enableVertexAttribArray(shaderProgram.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffers[whichSet]);
        gl.vertexAttribPointer(shaderProgram.ambient, 3, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(shaderProgram.ambient);

        gl.bindBuffer(gl.ARRAY_BUFFER,diffuseBuffers[whichSet]);
        gl.vertexAttribPointer(shaderProgram.diffuse, 3, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(shaderProgram.diffuse);

        gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffers[whichSet]);
        gl.vertexAttribPointer(shaderProgram.specular, 3, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(shaderProgram.specular);

        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffers[whichSet]);
        gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(shaderProgram.vertexNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER,factorBuffers[whichSet]);
        gl.vertexAttribPointer(shaderProgram.factor, 1, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(shaderProgram.factor);

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichSet]); // activate
        gl.drawElements(gl.TRIANGLES,bufferSize[whichSet],gl.UNSIGNED_SHORT,0); // render

        // console.log(fac);

    }
    
}

function main() {
  
  setupWebGL();
  loadTriangles();
  setupShaders();
  renderTriangles();

  document.onkeydown = handleKeyDown;
  document.onkeypress = handleKeyPress;
  
}   