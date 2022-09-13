const $ = document;
const DEG_UNIT = 1;
const PERSPECTIVE = 200;
const ROTATE_DELAY = 10;
const FORWARD_DELAY = 20;
const FRAME_WIDTH = 375;
let SCALE = 1;
//const SCALE = 5;
const FONT_SIZE = 2;

var initCount = 0;

var transform, forwardPlusIntervalID, rotateYPlusIntervalID, rotateYMinusIntervalID, translateYPlusID, translateYMinusID, jumpIntervalID;

var lastExec, interval;

window.onload = function() {
  if (navigator.userAgent
      .match(/iPhone|Android.+Mobile/)) {
    SCALE = 1;
  } else {
    SCALE = 5;
  }
  sizeAdjust();
  setEvent();
}

const PLAYER = {
  rotateY: 135,
  deg: 0,
  viewX: 0,
  viewZ: 0,
  moveX: -90,
  moveZ: 90,
  translateY: -20,
  init: function() {
    this.deg = 135;
    this.rotateY = this.deg;
    this.viewX = 0;
    this.viewZ = 0;
    this.moveX = -90;
    this.moveZ = 90;
    this.translateY = -20;
  },
};

const JUDGE = {
  hide: function() {
    $.querySelector("#judge").classList.add("hide");
  },
  show: function() {
    $.querySelector("#judge .pl .wall").innerText = WALL.msg;
    $.querySelector("#judge .em .wall").style.background = 'url("wall.jpg") bottom / cover';
    $.querySelector("#judge")
      .classList.remove("hide");
  },
  exec: function() {
    let score = WALL.getScore();
    let rateP = Math.round(score.player / (score.player + score.enemy) * 100);
    let rateE = 100 - rateP;
    $.querySelector("#judge .result .pl .point").innerText = score.player + "p";
    $.querySelector("#judge .result .em .point").innerText = score.enemy + "p";
    this.show();
    $.querySelector("#judge .result .pl .rate").innerText = rateP + "%";
    $.querySelector("#judge .result .em .rate").innerText = rateE + "%";
    $.querySelector("#judge .result .pl").style.width = rateP + "%";
    $.querySelector("#judge .result .em").style.width = rateE + "%";
    let h1 = $.querySelector("h1");
    h1.style.transform = "translateX(" + (FRAME_WIDTH / 2 - 20 - 30) * SCALE + "px) translateY(" + WALL.width * 5 * SCALE + "px) scale(0.6, 0.6)";
    h1.style.opacity = 1;
    if (rateP < rateE) {
      h1.innerText = ":)"
      $.querySelector("#judge .result p a").innerText = "You lose!";
    } else if (rateP > rateE) {
      $.querySelector("#judge .result p a").innerText = "You win!";
    } else {
      $.querySelector("#judge .result p a").innerText = "Draw...";
    }
  }
};

const MAIN = {
  timeLimit: 100,
  timer: function() {
    let percentage = 0;
    let intervalId = setInterval(() => {
      if (percentage >= this.timeLimit) {
        clearInterval(intervalId);
        ENEMY.stop();
        CTRL.hide();
        JUDGE.exec();
      } else {
        percentage++;
        $.querySelector("#chkdsk .percent").innerText = percentage;
      }
    }, 1000);
  },
};

function init() {
  lastExec = Date.now();
  interval = 0;
  
  PLAYER.init();
  
  WALL.init();
  FIELD.setWall();
  
  MAIN.timer();
  
  let areaCount = FIELD.getFloorCount();
  let floorCount = 100 - WALL.data.length;
  if (areaCount < floorCount) {
    //$.querySelector("#reinit span").innerText = ++initCount;
    init();
  } else {
    ENEMY.move();
    ITEM.init();
    animate();
  }
}

const ITEM = {
  data: [],
  init: function() {
    this.data = [];
    for (let r = 0; r < FIELD.table.length; r++) {
      for (let c = 0; c < FIELD.table[r].length; c++) {
        if (FIELD.table[r][c] == 0) {
          let wallCount = 0;
          //n
          if ((r != 0 && FIELD.table[r - 1][c] == 1) || r == 0) wallCount++;
          //e
          if ((c != 9 && FIELD.table[r][c + 1] == 1) || c == 9) wallCount++;
          //s
          if ((r != 9 && FIELD.table[r + 1][c] == 1) || r == 9) wallCount++;
          //w
          if ((c != 0 && FIELD.table[r][c - 1] == 1) || c == 0) wallCount++;
          if (wallCount == 3) {
            this.data.push({x: FIELD.c2x(c), z: FIELD.r2z(r), weight: FIELD.c2x(c) + FIELD.r2z(r) * -1});
          }
        }
      }
    }
    this.data = this.data.sort((a, b) => {
      if (a.weight > b.weight) return -1;
      if (a.weight < b.weight) return 1;
      return 0;
    });
    //$.querySelector("#item span").innerText = JSON.stringify(this.data);
    this.drawMap();
  },
  drawMap: function() {
    $.querySelectorAll(".item:not(.origin)")
      .forEach(item => item.remove());
    for (let i = 0; i < this.data.length; i++) {
      let mapItem = $.querySelector("#map .item.origin").cloneNode(true);
      mapItem.classList.add("item" + i);
      mapItem.classList.remove("origin");
      mapItem.style.transform = "translateX(" + (this.data[i].x / 2 + 50 - 5) + "px) translateY(" + (this.data[i].z / -2 + 50 - 5) + "px)";
      mapItem.innerText = i;
      //$.querySelector("#map").appendChild(mapItem);
    }
  },
};

const WALL = {
  data: [],
  stateDefault: 0,
  statePlayer: 1,
  stateEnemy: 2,
  maxNum: 40,
  width: 20,
  msg: "A problem has been detected and Windows has been shut down to prevent damage to your computer.",
  exist: function(x, z) {
    return this.data.some(w => w.x == x && w.z == z);
  },
  init: function() {
    this.data = [];
    for (let i = 0; i < this.maxNum; i++) {
      let tmpX = rand(-5, 4) * 20 + 10;
      let tmpZ = rand(-5, 4) * 20 + 10;
      if (this.isPlaceable(tmpX, tmpZ)) {
        this.data.push({x: tmpX, z: tmpZ, r: FIELD.z2r(tmpZ), c: FIELD.x2c(tmpX), state: this.stateDefault});
      }
    }
    //$.querySelector("#walls span").innerText = JSON.stringify(this.data);
    this.draw();
  },
  isPlaceable: function(x, z) {
    if (!(x == -90 && z > 00) && 
      !(x > 00 && z == -90) && 
      !(x == 90 && z < 00) && 
      !(x < 00 && z == 90) && 
      !this.data.some(w => w.x == x && w.z == z)) {
      return true;
    }
    return false;
  },
  draw: function() {
    $.querySelectorAll(".obj:not(.origin)")
      .forEach(w => w.remove());
    for (let i = 0; i < this.data.length; i++) {
      let obj = $.querySelector("#space .obj.origin").cloneNode(true);
      obj.classList.add("obj" + i);
      obj.classList.remove("origin");
      let transform = "translateX(" + (Math.round((this.data[i].x + 90) * 100) * SCALE / 100) + "px) ";
      transform += "translateY(" + 30 * SCALE + "px) ";
      transform += "translateZ(" + (Math.round(this.data[i].z * 100 * -1) * SCALE / 100) + "px) ";
      obj.style.transform = transform;
      //obj.childNodes.forEach(node => node.innerText = MSG);
      $.querySelector("#container")
        .appendChild(obj);
      
      let mapObj = $.querySelector("#map .obj.origin").cloneNode(true);
      mapObj.classList.add("obj" + i);
      mapObj.classList.remove("origin");
      mapObj.style.transform = "translateX(" + (this.data[i].x / 2 + 50 - 5) + "px) translateY(" + (this.data[i].z / -2 + 50 - 5) + "px)";
      $.querySelector("#map").appendChild(mapObj);
    }
  },
  changeState: function(index, state) {
    this.data[index].state = state;
    $.querySelector("#space .obj" + index)
      .classList.remove("p", "e");
    $.querySelector("#map .obj" + index)
      .classList.remove("p", "e");
    let className = "";
    let text = "";
    if (state == this.statePlayer) {
      className = "p";
      text = this.msg;
    } else if (state == this.stateEnemy) {
      className = "e";
    }
    $.querySelector("#space .obj" + index).classList.add(className);
    $.querySelectorAll("#space .obj" + index + " .wall").forEach(function(el) {
      el.innerText = text;
    });
    $.querySelector("#map .obj" + index).classList.add(className);
    //$.querySelector("#walls span").innerText = JSON.stringify(this.data);
    let score = this.getScore();
    //$.querySelector("#score span").innerText = JSON.stringify(score);
  },
  getScore: function() {
    let p = this.data.filter(w => w.state == this.statePlayer).length;
    let e = this.data.filter(w => w.state == this.stateEnemy).length;
    return {player: p, enemy: e};
  },
};

const FIELD = {
  //0: floor, 1: wall
  table: [],
  floors: [],
  floorExist: function(c, r) {
    return this.floors.some(f => f.c == c && f.r == r);
  },
  setWall: function() {
    this.table = Array(10).fill().map(() => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    for (const w of WALL.data) {
      this.table[w.r][w.c] = 1;
    }
  },
  z2r: z => (z * -1 + 90) / 20,
  x2c: x => (x + 90) / 20,
  r2z: r => r * -20 + 90,
  c2x: c => c * 20 - 90,
  getFloorCount: function() {
    this.crawl();
    //$.querySelector("#floors span").innerText = JSON.stringify(this.floors);
    this.drawFloor();
    return this.floors.length;
  },
  crawl: function() {
    this.floors = [{c: 0, r: 0, checked: false}];
    for (let i = 0; i < 100; i++) {
      let current = this.floors.find(floor => floor.checked == false);
      if (typeof current === 'undefined') return;
      
      //n
      if (this._canMove(current.c, current.r - 1)) this.floors.push({c: current.c, r: current.r - 1, checked: false});
      //e
      if (this._canMove(current.c + 1, current.r)) this.floors.push({c: current.c + 1, r: current.r, checked: false});
      //s
      if (this._canMove(current.c, current.r + 1)) this.floors.push({c: current.c, r: current.r + 1, checked: false});
      //w
      if (this._canMove(current.c - 1, current.r)) this.floors.push({c: current.c - 1, r: current.r, checked: false});
      
      current.checked = true;
    }
  },
  _canMove: function(c, r) {
    if (c < 0 || c > 9 || r < 0 || r > 9) return false;
    if (WALL.exist(this.c2x(c), this.r2z(r))) return false;
    if (this.floorExist(c, r)) return false;
    return true;
  },
  drawFloor: function() {
    for (let i = 0; i < this.floors.length; i++) {
      let mapObj = $.querySelector("#map .obj.origin").cloneNode(true);
      mapObj.classList.add("objb" + i, "objb");
      mapObj.classList.remove("origin");
      mapObj.style.transform = "translateX(" + (this.floors[i].c * 10) + "px) translateY(" + (this.floors[i].r * 10) + "px)";
      //mapObj.style.background = "rgba(0, 0, 255, 0.5)";
      $.querySelector("#map").appendChild(mapObj);
    }
  },
};

const ENEMY = {
  x: 90,
  z: -90,
  _intervalId: 0,
  stop: function() {
    clearInterval(this._intervalId);
  },
  init: function() {
    this.x = 90;
    this.z = -90;
  },
  msg: "Cleaning up",
  isFound: function() {
    let offset = WALL.width / 2;
    let em = {x: this.x, y: this.z};
    let player = {x: PLAYER.moveX, y: PLAYER.moveZ};
    let w = WALL.data;
    for (let i = 0; i < w.length; i++) {
      let sides = [
        [
          {x: w[i].x - offset, y: w[i].z + offset},
          {x: w[i].x + offset, y: w[i].z + offset}
        ],
        [
          {x: w[i].x + offset, y: w[i].z + offset},
          {x: w[i].x + offset, y: w[i].z - offset}
        ],
        [
          {x: w[i].x - offset, y: w[i].z - offset},
          {x: w[i].x + offset, y: w[i].z - offset}
        ],
        [
          {x: w[i].x - offset, y: w[i].z + offset},
          {x: w[i].x - offset, y: w[i].z - offset}
        ]
      ];
      for (let j = 0; j < sides.length; j++) {
        if (isCross(em, player, sides[j][0], sides[j][1])) {
          //$.querySelector("#found span").innerText = "not founded";
          return false;
        }
      }
    }
    //$.querySelector("#found span").innerText = "founded";
    return true;
  },
  move: function() {
    this._intervalId = setInterval(() => {
      if ($.querySelector("#space .enemy").style.transition == "") {
        $.querySelector("#space .enemy").style.transition = "transform 2s linear";
      }
      let xDist = Math.abs(this.x - PLAYER.moveX);
      let zDist = Math.abs(this.z - PLAYER.moveZ);
      if (xDist < WALL.width
          && zDist < WALL.width) {
        alert(this.msg);

        this.init();
        PLAYER.init();
        animate();
        return;
      }
      let index = 0;
      let movableCoords = this.getMovableCoords();
      //$.querySelector("#movableCoords span").innerText = JSON.stringify(movableCoords);
      if (this.isFound()) {
        let direction = this.getPlayersDirection(xDist, zDist);
        index = movableCoords.findIndex(mc => {
          if (direction == mc.direction) return true;
        });
        if (index === -1) index = 0;
      } else {   
        index = rand(0, movableCoords.length - 1);
      }
      
      this.x = movableCoords[index].x;
      this.z = movableCoords[index].z;
      
      this.changeWall();
      animate();
    }, 2000);
  },
  changeWall: function() {
    let wallIndexes = [];
    wallIndexes.push(WALL.data.findIndex(w => w.x == this.x && w.z == this.z + WALL.width));
    wallIndexes.push(WALL.data.findIndex(w => w.x == this.x + WALL.width && w.z == this.z));
    wallIndexes.push(WALL.data.findIndex(w => w.x == this.x && w.z == this.z - WALL.width));
    wallIndexes.push(WALL.data.findIndex(w => w.x == this.x - WALL.width && w.z == this.z));
    wallIndexes.forEach(wallIndex => {
      if (wallIndex !== -1) 
        WALL.changeState(wallIndex, WALL.stateEnemy);
    });
  },
  getPlayersDirection: function(xDistance, zDistance) {
    if (xDistance > zDistance) {
      if (this.x > PLAYER.moveX) {
        return "w";
      } else {
        return "e";
      }
    } else {
      if (this.z > PLAYER.moveZ) {
        return "s";
      } else {
        return "n";
      }
    }
  },
  getMovableCoords: function() {
    let coords = [];
    if (this.z < 90) coords.push({direction: "n", x: this.x, z: this.z + WALL.width});
    if (this.x < 90) coords.push({direction: "e", x: this.x + WALL.width, z: this.z});
    if (this.z > -90) coords.push({direction: "s", x: this.x, z: this.z - WALL.width});
    if (this.x > -90) coords.push({direction: "w", x: this.x - WALL.width, z: this.z});
    let result = [];
    coords.forEach(coord => {
      let blockIndex = WALL.data.findIndex(function(w) {
        if (coord.x == w.x && coord.z == w.z) return true;
      });
      if (blockIndex == -1) result.push(coord);
    });
    return result;
  },
};

const CTRL = {
  hide: function() {
    $.querySelector("#ctrl").classList.add("hide");
  },
  show: function() {
    $.querySelector("#ctrl").classList.remove("hide");
  },
};

function setEvent() {
  //pc
  if (window.ontouchstart === undefined) {
    $.querySelector("#forward .plus").addEventListener("mousedown", () => {
      forwardPlusIntervalID = setInterval(() => {
        forwardPlus();
      }, FORWARD_DELAY);
    });
    $.querySelector("#forward .plus").addEventListener("mouseup", () => {
      clearInterval(forwardPlusIntervalID);
    });
    $.querySelector("#forward .plus").addEventListener("mouseleave", () => {
      clearInterval(forwardPlusIntervalID);
    });

    $.querySelector("#rotateY .plus").addEventListener("mousedown", () => {
      rotateYPlusIntervalID = setInterval(() => {
        rotateYPlus();
      }, ROTATE_DELAY);
    });
    $.querySelector("#rotateY .plus").addEventListener("mouseup", () => {
      clearInterval(rotateYPlusIntervalID);
    });
    $.querySelector("#rotateY .plus").addEventListener("mouseleave", () => {
      clearInterval(rotateYPlusIntervalID);
    });
    
    $.querySelector("#rotateY .minus").addEventListener("mousedown", () => {
      rotateYMinusIntervalID = setInterval(() => {
        rotateYMinus();
      }, ROTATE_DELAY);
    });
    $.querySelector("#rotateY .minus").addEventListener("mouseup", () => {
      clearInterval(rotateYMinusIntervalID);
    });
    $.querySelector("#rotateY .minus").addEventListener("mouseleave", () => {
      clearInterval(rotateYMinusIntervalID);
    });
    
  //mobile
  } else {
    $.querySelector("#forward .plus").addEventListener("touchstart", () => {
      forwardPlusIntervalID = setInterval(() => {
        forwardPlus();
      }, FORWARD_DELAY);
    });
    $.querySelector("#forward .plus").addEventListener("touchend", () => {
      clearInterval(forwardPlusIntervalID);
    });
    $.querySelector("#forward .plus").addEventListener("touchleave", () => {
      clearInterval(forwardPlusIntervalID);
    });

    $.querySelector("#rotateY .plus").addEventListener("touchstart", e => {
      rotateYPlusIntervalID = setInterval(() => {
        rotateYPlus();
      }, ROTATE_DELAY);
    });
    $.querySelector("#rotateY .plus").addEventListener("touchend", () => {
      clearInterval(rotateYPlusIntervalID);
    });
    $.querySelector("#rotateY .plus").addEventListener("touchleave", () => {
      clearInterval(rotateYPlusIntervalID);
    });
    
    $.querySelector("#rotateY .minus").addEventListener("touchstart", () => {
      rotateYMinusIntervalID = setInterval(() => {
        rotateYMinus();
      }, ROTATE_DELAY);
    });
    $.querySelector("#rotateY .minus").addEventListener("touchend", () => {
      clearInterval(rotateYMinusIntervalID);
    });
    $.querySelector("#rotateY .minus").addEventListener("touchleave", () => {
      clearInterval(rotateYMinusIntervalID);
    });
  }
  
  //common
  $.querySelector("#start input").addEventListener("click", () => {
    $.querySelector("h1").style.animation = "h1 1s";
    setTimeout(() => {
      $.querySelector("h1").style.background = "red";
      $.querySelector("#title").classList.add("hide");
      $.querySelector("#frame").classList.remove("hide");
      $.querySelector("#chkdsk").classList.remove("hide");
      //$.querySelector("#ctrl").classList.remove("hide");
      CTRL.show();
      $.querySelector("h1").style.transform = "translateX(" + (FRAME_WIDTH / 2 - 20 - 30) * SCALE + "px) translateY(" + 65 + "px) scale(0.3, 0.3)";
      $.querySelector("h1").style.opacity = 0;
      init();
    }, 1000);
  });
    
  $.querySelector("#translateY .jmp").addEventListener("click", () => {
    if (!jumpIntervalID) jump();
  });
}

function jump() {
  let isRise = true;
  jumpIntervalID = setInterval(() => {
    if (isRise && PLAYER.translateY < 20) {
      PLAYER.translateY++;
    } else if (isRise && PLAYER.translateY == 20) {
      isRise = false;
    } else if (!isRise && PLAYER.translateY > -20) {
      PLAYER.translateY--;
    } else {
      clearInterval(jumpIntervalID);
      jumpIntervalID = null;
    }
    animate();
  }, ROTATE_DELAY);
}

function rotateYPlus() {
  let now = Date.now();
  interval = now - lastExec;
  lastExec = now;
  
  PLAYER.rotateY += DEG_UNIT;
  PLAYER.deg = PLAYER.rotateY % 360;
  animate();
}

function rotateYMinus() {
  let now = Date.now();
  interval = now - lastExec;
  lastExec = now;
  
  PLAYER.rotateY -= DEG_UNIT;
  PLAYER.deg = PLAYER.rotateY % 360;
  animate();
}

function forwardPlus() {
  let tmpX = Math.round((PLAYER.moveX + 1 * Math.sin(getRad(PLAYER.deg))) * 100) / 100;
  let tmpZ = Math.round((PLAYER.moveZ + 1 * Math.cos(getRad(PLAYER.deg))) * 100) / 100;
  
  let movableX = true;
  let movableZ = true;
  
  for (let i = 0; i < WALL.data.length; i++) {
    let xMin = WALL.data[i].x - 19;
    let xMax = WALL.data[i].x + 19;
    let zMin = WALL.data[i].z - 19;
    let zMax = WALL.data[i].z + 19;
    if (tmpX > xMin && tmpX < xMax && tmpZ > zMin && tmpZ < zMax) {
      if ((PLAYER.moveX == xMin && PLAYER.moveZ == zMin) ||
         (PLAYER.moveX == xMin && PLAYER.moveZ == zMax) ||
         (PLAYER.moveX == xMax && PLAYER.moveZ == zMin) ||
         (PLAYER.moveX == xMax && PLAYER.moveZ == zMax)) {
        continue;
      }
      let isSetState = false;
      if (PLAYER.moveX <= xMin) {
        PLAYER.moveX = xMin;
        movableX = false;
        isSetState = true;
      } else if (PLAYER.moveX >= xMax) {
        PLAYER.moveX = xMax;
        movableX = false;
        isSetState = true;
      } else if (PLAYER.moveZ <= zMin) {
        PLAYER.moveZ = zMin;
        movableZ = false;
        isSetState = true;
      } else if (PLAYER.moveZ >= zMax) {
        PLAYER.moveZ = zMax;
        movableZ = false;
        isSetState = true;
      }
      if (isSetState && WALL.data[i].state != 1) {
        WALL.changeState(i, WALL.statePlayer);
      }
    }
  }
  if (movableX) {
    if (tmpX > 90) {
      PLAYER.moveX = 90;
    } else if(tmpX < -90) {
      PLAYER.moveX = -90;
    } else {
      PLAYER.moveX = tmpX;
    }
  }
  if (movableZ) {
    if (tmpZ > 90) {
      PLAYER.moveZ = 90;
    } else if(tmpZ < -90) {
      PLAYER.moveZ = -90;
    } else {
      PLAYER.moveZ = tmpZ;
    }
  }
  animate();
}

function sizeAdjust() {
  var h1 = $.querySelector("h1").style;
  h1.fontSize = FONT_SIZE * SCALE * 22.5 + "px";
  h1.lineHeight = FONT_SIZE * SCALE * 30 + "px";
  h1.width = FONT_SIZE * SCALE * 30 + "px";
  h1.borderRadius = FONT_SIZE * SCALE * 30 + "px " + FONT_SIZE * SCALE * 30 + "px";
  h1.left = FONT_SIZE * SCALE * 10 + "px";
  h1.top = FONT_SIZE * SCALE * 12.5 + "px";

  $.querySelector("#title").style.height = FONT_SIZE * SCALE * 65 + "px";
  $.querySelector("#title").style.padding = FONT_SIZE * SCALE * 40 + "px " + FONT_SIZE * SCALE * 20 + "px " + FONT_SIZE * SCALE * 20 + "px ";

  $.querySelector("#title p").style.fontSize = FONT_SIZE * SCALE * 5 + "px";

  $.querySelector("#frame").style.width = FRAME_WIDTH * SCALE + "px";

  let space = $.querySelector("#space").style;
  space.width = WALL.width * 10 * SCALE + "px";
  space.height = WALL.width * 2.5 * SCALE + "px";
  space.perspective = WALL.width * 10 * SCALE + "px";
  space.margin = WALL.width * 5 * SCALE + "px auto";
  
  $.querySelectorAll("#field li").forEach(function (el){
    el.style.width = WALL.width * 10 * SCALE + "px";
  });

  $.querySelectorAll("#field .wall").forEach(function(el) {
    el.style.height = WALL.width * 2.5 * SCALE + "px";
    el.style.lineHeight = WALL.width * 2.5 * SCALE + "px";
  });
  $.querySelector("#field .east").style.transform = "translateX(" + WALL.width * 5 * SCALE + "px) rotateY(270deg)";
  $.querySelector("#field .west").style.transform = "translateX(" + WALL.width * 5 * SCALE * -1 + "px) rotateY(90deg)";
  $.querySelector("#field .south").style.transform = "translateZ(" + WALL.width * 5 * SCALE + "px) rotateY(180deg)";
  $.querySelector("#field .north").style.transform = "translateZ(" + WALL.width * 5 * SCALE * -1 + "px)";
  
  $.querySelector("#space .enemy").style.width = WALL.width * SCALE + "px";
  $.querySelector("#space .enemy").style.height = WALL.width * SCALE + "px";
  $.querySelector("#space .enemy div").style.lineHeight = WALL.width * SCALE + "px";
  $.querySelector("#space .enemy div").style.borderRadius = WALL.width * SCALE + "px";
  $.querySelector("#space .enemy div").style.fontSize = WALL.width * 0.75 * SCALE + "px";
  
  $.querySelector("#space .obj").style.width = WALL.width * SCALE + "px";

  $.querySelectorAll("#space .obj li").forEach(function(el) {
    el.style.width = WALL.width * SCALE + "px";
    el.style.height = WALL.width * SCALE + "px";
    el.style.lineHeight = WALL.width * SCALE + "px";
    el.style.fontSize = FONT_SIZE * SCALE + "px";
    el.style.lineHeight = FONT_SIZE * SCALE + "px";
  });
  $.querySelectorAll("#space .obj .east").forEach(function(el) {
    el.style.transform = "translateX(" + WALL.width * SCALE / 2 + "px) rotateY(90deg)";
  });
  $.querySelectorAll("#space .obj .west").forEach(function(el) {
    el.style.transform = "translateX(" + WALL.width * SCALE / 2 * -1 + "px) rotateY(270deg)";
  });
  $.querySelectorAll("#space .obj .south").forEach(function(el) {
    el.style.transform = "translateZ(" + WALL.width * SCALE / 2 + "px)";
  });
  $.querySelectorAll("#space .obj .north").forEach(function(el) {
    el.style.transform = "translateZ(" + WALL.width * SCALE / 2 * -1 + "px) rotateY(180deg)";
  });
  $.querySelectorAll("#space .obj .top").forEach(function(el) {
    el.style.transform = "translateY(" + WALL.width * SCALE / 2 * -1 + "px) rotateX(90deg)";
  });
  
  let judge = $.querySelector("#judge").style;
  judge.width = FRAME_WIDTH * SCALE + "px";
  judge.height = WALL.width * 9.5 * SCALE + "px";
  judge.padding = WALL.width * 1.5 * SCALE + "px 0";
  $.querySelectorAll("#judge > .pl, #judge > .em").forEach(el => {
    el.style.width = (FRAME_WIDTH - WALL.width * 5) / 2 * SCALE + "px";
    el.style.marginBottom = WALL.width * SCALE + "px";
  });
  $.querySelectorAll("#judge .wall").forEach(el => {
    el.style.width = WALL.width * 5 * SCALE + "px";
    el.style.height = WALL.width * 5 * SCALE + "px";
  });
  $.querySelectorAll("#judge .name").forEach(el => el.style.fontSize = WALL.width * 0.75 * SCALE + "px");
  $.querySelector("#judge .result").style.margin = "0 " + WALL.width * SCALE + "px";
  let jdgMsg = $.querySelector("#judge .result .msg").style;
  jdgMsg.width = FRAME_WIDTH - WALL.width * 2 + "px";
  jdgMsg.fontSize = WALL.width * 1 + "px";
  $.querySelectorAll("#judge .result .rate").forEach(el => el.style.fontSize = WALL.width * 1 * SCALE + "px");
  
  $.querySelector("#map").style.width = WALL.width * 5 * SCALE + "px";
  $.querySelector("#map").style.height = WALL.width * 5 * SCALE + "px";

}

function getRad(degree) {
  return degree * Math.PI / 180;
}

function animate() {
  PLAYER.viewX = PERSPECTIVE * Math.sin(getRad(PLAYER.deg));
  PLAYER.viewZ = PERSPECTIVE * Math.cos(getRad(PLAYER.deg));

  transformField = "rotateY(" + PLAYER.rotateY + "deg) translateX(" + (Math.round((PLAYER.viewX + PLAYER.moveX) * -1 * 100) / 100) * SCALE + "px) translateY(" + PLAYER.translateY * SCALE + "px) translateZ(" + (Math.round((PLAYER.viewZ + PLAYER.moveZ) * 100) / 100) * SCALE + "px) ";
  
  $.querySelector("#container").style.transform = transformField;
  
  $.querySelector("#space .enemy").style.transform = "translateX(" + (ENEMY.x + 90) * SCALE + "px) translateY(" + 30 * SCALE + "px) translateZ(" + ENEMY.z * -1 * SCALE + "px)";
  $.querySelector("#space .enemy div").style.transform = "rotateY(" + (180 - PLAYER.rotateY) +  "deg)";
  
  map();
  debug();
}

function map() {
  $.querySelector("#map .pl").style.transform = "translateX(" + (PLAYER.moveX / 2 + 50 - 5) + "px) translateY(" + (PLAYER.moveZ / -2 + 50 - 5) + "px) rotateZ(" + PLAYER.rotateY + "deg)";

  $.querySelector("#map .em").style.transform = "translateX(" + (ENEMY.x / 2 + 50 - 5) + "px) translateY(" + (ENEMY.z / -2 + 50 - 5) + "px)";
}

function debug() {
  $.querySelector("#deg span").innerText = deg + "°, " + interval + "ms";
  $.querySelector("#transform span").innerText = transformField;
  
  $.querySelector("#pl .moveX").innerText = PLAYER.moveX;
  $.querySelector("#pl .moveZ").innerText = PLAYER.moveZ;

  $.querySelector("#enemy span").innerText = "x: " + ENEMY.x + ", z: " + ENEMY.z;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max + 1 - min)) + min;
}

function isCross(a, b, c, d) {
  let s = (a.x - b.x) * (c.y - a.y) - (a.y - b.y) * (c.x - a.x);
  let t = (a.x - b.x) * (d.y - a.y) - (a.y - b.y) * (d.x - a.x);
  if (s * t > 0) return false;
  s = (c.x - d.x) * (a.y - c.y) - (c.y - d.y) * (a.x - c.x);
  t = (c.x - d.x) * (b.y - c.y) - (c.y - d.y) * (b.x - c.x);
  if (s * t > 0) return false;
  
  return true;
}