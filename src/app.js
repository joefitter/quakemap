'use strict';

var continents = ["europe", "asia", "africa", "north_america", "south_america", "antartica", "oceanic"];
var ref = new Firebase("https://publicdata-earthquakes.firebaseio.com/by_continent/");

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 4000 );

var controls = new THREE.OrbitControls( camera );
controls.damping = 500;
controls.minDistance = 1000;
controls.maxDistance = 4000;
controls.addEventListener( 'change', render );

var onRenderFcts = [];

var renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

var geom = new THREE.Geometry();
var cubeMat = new THREE.MeshPhongMaterial({color: 0xff0000,opacity:0.6});

function mapQuake(snapshot) {
  var quake = snapshot.val();
  var location = latLongToVector3(quake.location.lat, quake.location.lng, 600, 1000);

  var mag = quake.mag * 7;

  var cylinderGeometry = new THREE.CylinderGeometry(0, mag, mag * 2);
  cylinderGeometry.applyMatrix( new THREE.Matrix4().makeRotationFromEuler( new THREE.Euler( Math.PI / 2, Math.PI, 0 ) ) );

  var cube = new THREE.Mesh(cylinderGeometry, cubeMat);
  cube.position.x = location.x;
  cube.position.y = location.y;
  cube.position.z = location.z;
  cube.lookAt( earth.position );
  earth.add(cube);

  var d = new Date(quake.time);

  var days = d.getDate();

  if (days < 10) {
    days = '0' + days;
  }

  var month = d.getMonth() + 1;

  if (month < 10) {
    month = '0' + month;
  }

  var year = d.getFullYear();

  var canvas1 = document.createElement('canvas');
  var context1 = canvas1.getContext('2d');
  context1.font = "Bold 40px Arial";
  context1.fillStyle = "rgba(255,255,255,0.95)";
  // context1.fillText(quake.mag + 'mag; ' + days + '/' + month + '/' + year, 0, 40);
  context1.fillText(days + '/' + month + '/' + year, 0, 40);
    
  // canvas contents will be used for a texture
  var texture1 = new THREE.Texture(canvas1) 
  texture1.needsUpdate = true;

  var spriteMaterial = new THREE.SpriteMaterial( { map: texture1, useScreenCoordinates: true, color: 0xffffff} );

  var sprite1 = new THREE.Sprite( spriteMaterial );
  sprite1.position.set( 0, 0, -2* mag + 20);
  sprite1.scale.set(200,100, 1.0);
  cube.add( sprite1 ); 

  // document.addEventListener('mousemove', onDocumentMouseMove);

  // function onDocumentMouseMove( event ) 
  // {
  //   sprite1.position.set( 2* event.clientX, -2* event.clientY - 20, 1000 );
    
  //   // update the mouse variable
  //   m.x = -( event.clientX / window.innerWidth);
  //   m.y = ( event.clientY / window.innerHeight );
  // }

  animateHeight(cube, quake, 1000, mag);

}

function animateHeight(obj, data, num, end) {
  if (num > end) {
    requestAnimationFrame(function () {
      num = num / 1.25 > end ? num / 1.25 : end;
      animateHeight(obj, data, num, end);
    });
  }

  var location = latLongToVector3(data.location.lat, data.location.lng, 600, num);
  obj.position.x = location.x;
  obj.position.y = location.y;
  obj.position.z = location.z;
}

var geometry = new THREE.SphereGeometry(600, 50, 50);
var material = new THREE.MeshPhongMaterial({
  shininess: 5
});

material.map = THREE.ImageUtils.loadTexture('img/earthmap1k.jpg');
material.bumpMap = THREE.ImageUtils.loadTexture('img/earthbump1k.jpg');
material.bumpScale = 25;

material.specularMap = THREE.ImageUtils.loadTexture('img/earthspec1k.jpg');
material.specular = new THREE.Color('grey');

var earth = new THREE.Mesh(geometry, material);
earth.overdraw = true;
scene.add(earth);

continents.forEach(function (continent) {
  for (var mag = 0; mag < 10; mag++) {
    var magRef = ref.child(continent).child(mag.toString());
    magRef.orderByKey().limitToLast(3).on('child_added', mapQuake)
  }
});

function latLongToVector3(lat, lon, radius, height) {
  var phi = (lat)*Math.PI/180;
  var theta = (lon-180)*Math.PI/180;

  var x = -(radius+height) * Math.cos(phi) * Math.cos(theta);
  var y = (radius+height) * Math.sin(phi);
  var z = (radius+height) * Math.cos(phi) * Math.sin(theta);

  return new THREE.Vector3(x,y,z);

}


function createCloud() {
  var canvasResult  = document.createElement('canvas')
  canvasResult.width  = 1024
  canvasResult.height = 512
  var contextResult = canvasResult.getContext('2d')   

  // load earthcloudmap
  var imageMap  = new Image();
  imageMap.addEventListener("load", function() {
    
    // create dataMap ImageData for earthcloudmap
    var canvasMap = document.createElement('canvas')
    canvasMap.width = imageMap.width
    canvasMap.height= imageMap.height
    var contextMap  = canvasMap.getContext('2d')
    contextMap.drawImage(imageMap, 0, 0)
    var dataMap = contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height)

    // load earthcloudmaptrans
    var imageTrans  = new Image();
    imageTrans.addEventListener("load", function(){
      // create dataTrans ImageData for earthcloudmaptrans
      var canvasTrans   = document.createElement('canvas')
      canvasTrans.width = imageTrans.width
      canvasTrans.height  = imageTrans.height
      var contextTrans  = canvasTrans.getContext('2d')
      contextTrans.drawImage(imageTrans, 0, 0)
      var dataTrans   = contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height)
      // merge dataMap + dataTrans into dataResult
      var dataResult    = contextMap.createImageData(canvasMap.width, canvasMap.height)
      for(var y = 0, offset = 0; y < imageMap.height; y++){
        for(var x = 0; x < imageMap.width; x++, offset += 4){
          dataResult.data[offset+0] = dataMap.data[offset+0]
          dataResult.data[offset+1] = dataMap.data[offset+1]
          dataResult.data[offset+2] = dataMap.data[offset+2]
          dataResult.data[offset+3] = 255 - dataTrans.data[offset+0]
        }
      }
      // update texture with result
      contextResult.putImageData(dataResult,0,0)  
      material.map.needsUpdate = true;
    })
    imageTrans.src  = 'img/earthcloudmaptrans.jpg';
  }, false);
  imageMap.src  = 'img/earthcloudmap.jpg';

  var geometry  = new THREE.SphereGeometry(610, 50, 50)
  var material  = new THREE.MeshPhongMaterial({
    map   : new THREE.Texture(canvasResult),
    side    : THREE.DoubleSide,
    transparent : true,
    opacity   : 0.8,
  })
  var mesh  = new THREE.Mesh(geometry, material)
  return mesh
}

var cloud = createCloud();
scene.add(cloud);

var ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xcccccc);
directionalLight.position.set(0.1, 0.1, 0.1).normalize();
scene.add(directionalLight);

camera.position.set(1800, 1000, 1800);
camera.lookAt(new THREE.Vector3(0,0,0));

onRenderFcts.push(function () {
  render()
});

onRenderFcts.push(function (delta, now) {
  earth.rotation.y += 1/32 * delta;
});

onRenderFcts.push(function (delta, now) {
  cloud.rotation.y += 1/16 * delta;
});

var lastTimeMsec = null;

// var mouse = {x : 0, y : 0}
// document.addEventListener('mousemove', function(event){
//   mouse.x = (event.clientX / window.innerWidth ) - 0.5;
//   mouse.y = (event.clientY / window.innerHeight) - 0.5;
// }, false);

// onRenderFcts.push(function(delta, now){
//   camera.position.x += (mouse.x*8000 - camera.position.x) * (delta*3);
//   camera.position.y += (mouse.y*8000- camera.position.y) * (delta*3);
//   camera.lookAt( scene.position );
// });

function render() {
  renderer.render(scene, camera);
}

requestAnimationFrame(function animate(nowMsec) {
  requestAnimationFrame(animate);

  lastTimeMsec = lastTimeMsec || nowMsec - 1000/60;
  var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
  lastTimeMsec = nowMsec;

  onRenderFcts.forEach(function (func) {
    func(deltaMsec/1000, nowMsec/1000);
  });
});

