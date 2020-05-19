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

var inputTriangles;
var selectedTri = 0;
var scale = new vec3.fromValues(1.2, 1.2, 1.2);
var deselected = false;
var parallel = false;
var transformMats = [];

var vertexBuffers = [];
var triangleBuffers = [];
var ambientBuffers = [];
var diffuseBuffers = [];
var specularBuffers = [];
var normalBuffers = [];
var factorBuffers = [];
var bufferSize = [];
var centers = [];

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
mat4.perspective(perspectiveMat, Math.PI/2, 1, 0.5, 10);

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
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) {

        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var indexOffset = vec3.create(); // the index offset for the current set
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {

            transformMats.push(mat4.create());

            var coordArray = []; // 1D array of vertex coords for WebGL
            var indexArray = []; // 1D array of vertex indices for WebGL
            var ambients = [];
            var diffuses = [];
            var speculars = [];
            var normals = [];
            var factors = [];
            var triToAdd = [];
            var centerToAdd = vec3.create();

            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            
            var ambientToAdd = inputTriangles[whichSet].material.ambient;
            var diffuseToAdd = inputTriangles[whichSet].material.diffuse;
            var specularToAdd = inputTriangles[whichSet].material.specular;
            var factorToAdd = inputTriangles[whichSet].material.n;

            // set up the vertex coord array
            for (var whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                var vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);

                ambients.push(ambientToAdd[0], ambientToAdd[1], ambientToAdd[2]);
                diffuses.push(diffuseToAdd[0], diffuseToAdd[1], diffuseToAdd[2]);
                speculars.push(specularToAdd[0], specularToAdd[1], specularToAdd[2]);
                factors.push(factorToAdd);

                var normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                normals.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);
            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (var whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                triToAdd = inputTriangles[whichSet].triangles[whichSetTri];
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
                
                var tmp = vec3.create();
                vec3.add(tmp, tmp, inputTriangles[whichSet].vertices[triToAdd[0]]);
                vec3.add(tmp, tmp, inputTriangles[whichSet].vertices[triToAdd[1]]);
                vec3.add(tmp, tmp, inputTriangles[whichSet].vertices[triToAdd[2]]);
                vec3.scale(tmp, tmp, 1/3);
                vec3.add(centerToAdd, centerToAdd, tmp);
            } // end for triangles in set

            vec3.scale(centerToAdd, centerToAdd, 1/inputTriangles[whichSet].triangles.length);
            // centers.push(centerToAdd);
            centers.push( vec4.fromValues(centerToAdd[0], centerToAdd[1], centerToAdd[2], 1.0) );

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
    
    switch(event.keyCode) {
        case 37:
            // left:
            if(selectedTri == 0)
                selectedTri = inputTriangles.length-1;
            else
                selectedTri -= 1;
            
            deselected = false;
            break;

        case 39:
            // right
            selectedTri = (selectedTri + 1) % 4;
            deselected = false;
            break;

        case 32:
            // space
            deselected = true;
            break;
    }

    requestAnimationFrame(renderTriangles);
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
        // <
        case 60:
            parallel = false;
            break;
        // =
        case 61:
            parallel = true;
            break;

        // k
        case 107:
            if(!deselected)
                mat4.translate(transformMats[selectedTri], transformMats[selectedTri], [delta, 0, 0]);
            break;
        // ;
        case 59:
            if(!deselected)
                mat4.translate(transformMats[selectedTri], transformMats[selectedTri], [-delta, 0, 0]);
            break;
        // o
        case 111:
            if(!deselected)
                mat4.translate(transformMats[selectedTri], transformMats[selectedTri], [0, 0, -delta]);
            break;
        // l
        case 108:
            if(!deselected)
                mat4.translate(transformMats[selectedTri], transformMats[selectedTri], [0, 0, delta]);
            break;
        // i
        case 105:
            if(!deselected)
                mat4.translate(transformMats[selectedTri], transformMats[selectedTri], [0, delta, 0]);
            break;
        // p
        case 112:
            if(!deselected)
                mat4.translate(transformMats[selectedTri], transformMats[selectedTri], [0, -delta, 0]);
            break;
        // K
        case 75:
            if (!deselected)
                mat4.rotateY(transformMats[selectedTri], transformMats[selectedTri], Math.PI/18);
            break;
        // :
        case 58:
            if (!deselected)
                mat4.rotateY(transformMats[selectedTri], transformMats[selectedTri], -Math.PI/18);
            break;
        // O
        case 79:
            if (!deselected)
                mat4.rotateX(transformMats[selectedTri], transformMats[selectedTri], Math.PI/18);
            break;
        // L
        case 76:
            if (!deselected)
                mat4.rotateX(transformMats[selectedTri], transformMats[selectedTri], -Math.PI/18);
            break;
        // I
        case 73:
            if (!deselected)
                mat4.rotateZ(transformMats[selectedTri], transformMats[selectedTri], Math.PI/18);
            break;
        // P
        case 80:
            if (!deselected)
                mat4.rotateZ(transformMats[selectedTri], transformMats[selectedTri], -Math.PI/18);
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

    // gl.uniformMatrix4fv(modifyMatUniform, false, modifyMat);

    for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {

        var modifyMat = mat4.create();
        mat4.translate(modifyMat, modifyMat, centers[whichSet]);

        if(!deselected) {
            if(selectedTri == whichSet) {
                mat4.scale(modifyMat, modifyMat, scale);
            }
        }
        mat4.multiply(modifyMat, modifyMat, transformMats[whichSet]);
        mat4.translate(modifyMat, modifyMat, vec3.negate(vec3.create(), centers[whichSet]));
        gl.uniformMatrix4fv(modifyMatUniform, false, modifyMat);

        // part 5
        if(parallel)
            mat4.ortho(perspectiveMat, -1, 1, -1, 1, 0.5, 10);
        else
            mat4.perspective(perspectiveMat, Math.PI/2, 1, 0.5, 10);

        gl.uniformMatrix4fv(perspectiveMatUniform, false, perspectiveMat);

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