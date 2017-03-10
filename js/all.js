////////////////////////////   The Game Engine   /////////////////////////////////
var arrowCodes = {37: "left", 38:  "up", 39: "right", 27: "pause"};
var pauseCode = 27;

// TrackKeys Function
function trackKeys(codes) {
	var pressed = Object.create(null);
	function handler(event) {
		if (codes.hasOwnProperty(event.keyCode)) {
			var down = event.type == "keydown";
			pressed[codes[event.keyCode]] = down;
			event.preventDefault();
		}
	}
	addEventListener("keydown", handler);
	addEventListener("keyup", handler);
	return pressed;
}

// Pause Handler
// Tracks The Escape Button controll the pause state
function trackPause(code){
	//var pause = Object.create(null);
	var pause = { state: false,
				  clear: false,
				  paused: function() {return pause.state;} };

	var pauseState;
	var pause2;
	function pauseHandler(event) {
	
		 pauseState = pause.state;
		 pause2 = pause.clear;
	
		if (event.keyCode == code) {
			if (!pauseState && (event.type == "keydown") && !pause2){
				pause.state = true;
				pause.clear = false;
				console.log("Pause Issued");
			} else if (pauseState && (event.type == "keyup") && !pause2){
			// The first keyup we ignore but record so the following keydown cancels the pause
				pause.state = true;
				pause.clear = true;		
			} else if (pauseState && (event.type == "keydown") && pause2) {
				pause.state = false;
				pause.clear = true;
				console.log("Pause Arrested");
			} else if (!pauseState && (event.type == "keyup") && pause2) {
			// On the seconde keyup we reset the pause fsm so we can pause again
				pause.state = false;
				pause.clear = false;	
			}
		}				
	}		
	addEventListener("keydown", pauseHandler);
	addEventListener("keyup", pauseHandler);
	return pause;
}

// runAnimation
function runAnimation(frameFunc) {
	var lastTime = null;
	function frame(time) {
		var stop = false;
		if (lastTime != null) {
			var timeStep = Math.min(time - lastTime, 100) / 1000;
			stop = frameFunc(timeStep) === false;
		}
		lastTime = time;
		if (!stop)
			requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);
var pause = trackPause(pauseCode);
var gamePaused = pause.paused;

// runLevel
function runLevel(level, Display, Score, levelNum, lifeNum, andThen) {
	var display = new Display(document.body, level);
	var score = new Score(display.wrap, display.level.grid.length*scale, level);
	var pause3 = false;
	var gameOver2 = false 
	score.setLevelNum(levelNum);
	score.setLifeNum(lifeNum);
	score.setCoinCount(level.totalCoins);
	runAnimation(function(step) {
		
		//console.log("State of Pause:", pause);
		if (!gamePaused()) {	
			level.animate(step, arrows);
			if(level.foundCoin())
				score.setCoinNum(level.collectedCoins)
			if(pause3) {
				score.turnOffPause();
				pause3 = false;
			}
			display.drawFrame(step);
		}else{
			if(!pause3){
				score.turnOnPause();
				pause3 = true;
			}
		}

		if(level.status == "lost" && lifeNum == 0 && !gameOver2) {
			score.turnOnGameOver();
			gameOver2 = true;
		}
		
		if (level.isFinished()) {
			display.clear();
			if (andThen)
				andThen(level.status);
			return false
		}
	});
}


// runGame
function runGame(plans, Display, Score) {
	var initLives = 2;
	function startLevel(n, lives) {
		console.log("qp x0" + lives.toString());
		runLevel(new Level(plans[n]), Display, Score, n + 1, lives, function(status) {
			if (status == "lost") {
				if (lives > 0)
					startLevel(n, --lives);	
				else {
					console.log("Game Over");
					startLevel(0, initLives);
						
				}						
			} else if (n < plans.length - 1)
				startLevel((n + 1), lives);
			else
				console.log("You Win");				
		});
	}
	startLevel(0, initLives);
}

//////////////////////////////  The Plan  //////////////////////////////////
var simpleLevelPlan = [
	"                      ",
	"                      ",
	"  x              = x  ",
	"  x         o o    x  ",
	"  x @      xxxxx   x  ",
	"  xxxxx            x  ",
	"      x!!!!!!!!!!!!x  ",
	"      xxxxxxxxxxxxxx  ",
	"                      "
	
];






///////////////////////////////  Levels  ///////////////////////////////////

function Level(plan) {
	this.width = plan[0].length;
	this.height = plan.length;
	this.grid = [];
	this.actors = [];
	this.totalCoins = 0;
	this.collectedCoins = 0;
	this.oldCoinNo = 0;


	
	for(var y = 0; y < this.height; y++){
		var line = plan[y], gridLine = [];
		for(var x = 0; x < this.width; x++){
			var ch = line[x], fieldType = null;
			var Actor = actorChars[ch];
			if(Actor) {
				this.actors.push(new Actor(new Vector(x, y), ch));
				if(Actor == Coin)
					this.totalCoins++;
			}else if (ch == "x")
				fieldType = "wall";
			else if (ch == "!")
				fieldType = "lava";
			gridLine.push(fieldType);	
		}
		this.grid.push(gridLine);
	}
	
	this.player = this.actors.filter(function(actor) {
		return actor.type == "player";
	})[0];
	this.status = this.finishDelay = null;
}

// Check to see if number of collected coins has changed
Level.prototype.foundCoin = function() {
	if(this.collectedCoins != this.oldCoinNo){
		this.oldCoinNo = this.collectedCoins; 
		return true;
	}else {
		return false;
	}
};

// The isFinnished Function
Level.prototype.isFinished = function() {
	return this.status != null && this.finishDelay < 0;
};

// The obstacleAt Function
Level.prototype.obstacleAt = function(pos, size) {
	var xStart = Math.floor(pos.x);
	var xEnd = Math.ceil(pos.x + size.x);
	var yStart = Math.floor(pos.y);
	var yEnd = Math.ceil(pos.y + size.y); 
	
	if (xStart < 0 || xEnd > this.width || yStart < 0)
		return "wall";
	if (yEnd > this.height)
		return "lava";
	for (var y = yStart; y < yEnd; y++) {
		for (var x = xStart; x < xEnd; x++) {
			var fieldType = this.grid[y][x];
			if (fieldType) return fieldType;
		}
	}	
};

// The actorAt Function
Level.prototype.actorAt = function(actor) {
	for (var i = 0; i < this.actors.length; i++) {
		var other = this.actors[i];
		if (other != actor &&
			actor.pos.x + actor.size.x > other.pos.x &&
			actor.pos.x < other.pos.x + other.size.x &&
			actor.pos.y + actor.size.y > other.pos.y &&
			actor.pos.y < other.pos.y + other.size.y)
			return other;	
	}
};

// The Animator
var maxStep = 0.05;

Level.prototype.animate = function(step, keys) {
	if (this.status != null)
		this.finishDelay -= step;
		
	while (step > 0) {
		var thisStep = Math.min(step, maxStep);
		this.actors.forEach(function(actor) {
			actor.act(thisStep, this, keys);
		}, this);
	
		step -= thisStep;
	}
};

Level.prototype.playerTouched = function(type, actor) {
	if (type == "lava" && this.status == null) {
		this.status = "lost";
		this.finishDelay = 1;
	} else if (type == "coin") {
		this.collectedCoins++;
		this.actors = this.actors.filter(function(other) {
			return other != actor;
		});
		if (!this.actors.some(function(actor) {
			return actor.type == "coin";
		})) {
			this.status = "won";
			this.finishDelay = 1;
		}
	}
};



/////////////////////////////// Vectors ///////////////////////////////////

function Vector(x, y) {
	this.x = x; this.y = y;
}

Vector.prototype.plus = function(other) {
	return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.times = function(factor) {
	return new Vector(this.x * factor, this.y * factor);
};


///////////////////////////////  Actors  //////////////////////////////////

var actorChars = {
	"@" : Player,
	"o" : Coin,
	"=" : Lava, "|": Lava, "v" : Lava
};




/////////////////////////////// Players ///////////////////////////////////

function Player(pos) {
	this.pos = pos.plus(new Vector(0, -0.5));
	this.size = new Vector(0.8, 1.5);
	this.speed = new Vector(0, 0);
}

Player.prototype.type = "player";

var playerXSpeed = 7;

Player.prototype.moveX = function(step, level, keys) {
	this.speed.x = 0;
	if (keys.left) this.speed.x -= playerXSpeed;
	if (keys.right) this.speed.x += playerXSpeed;
	
	var motion = new Vector(this.speed.x * step, 0);
	var newPos = this.pos.plus(motion);
	var obstacle = level.obstacleAt(newPos, this.size);
	if (obstacle)
		level.playerTouched(obstacle);
	else
		this.pos = newPos;
};

var gravity = 30;
var jumpSpeed = 17;

Player.prototype.moveY = function(step, level, keys) {
	this.speed.y += step * gravity;
	var motion = new Vector(0, this.speed.y * step);
	var newPos = this.pos.plus(motion);
	var obstacle = level.obstacleAt(newPos, this.size);
	if (obstacle) {
		level.playerTouched(obstacle);
		if (keys.up && this.speed.y > 0)
			this.speed.y = -jumpSpeed;
		else
			this.speed.y = 0;
	} else {
		this.pos = newPos;
	}
};

Player.prototype.act = function(step, level, keys) {
	this.moveX(step, level, keys);
	this.moveY(step, level, keys);
	
	var otherActor = level.actorAt(this);
	if (otherActor)
		level.playerTouched(otherActor.type, otherActor);
	
	// Loosing Animation
	if (level.status == "lost") {
		this.pos.y += step;
		this.pos.y -= step;
	}
};


///////////////////////////////   Lava   ///////////////////////////////////

function Lava(pos, ch) {
	this.pos = pos;
	this.size = new Vector(1, 1);
	if (ch == "="){
		this.speed = new Vector(2, 0);
	} else if (ch == "|") {
		this.speed = new Vector(0, 2);
	} else if (ch == "v") {
		this.speed = new Vector(0, 3);
		this.repeatPos = pos;
	}
}

Lava.prototype.type = "lava";

Lava.prototype.act = function(step, level) {
	var newPos = this.pos.plus(this.speed.times(step));
	if (!level.obstacleAt(newPos, this.size))
		this.pos = newPos;
	else if (this.repeatPos)
		this.pos = this.repeatPos;
	else
		this.speed = this.speed.times(-1);
};



///////////////////////////////   Coin   ///////////////////////////////////

function Coin(pos) {
	this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
	this.size = new Vector(0.6, 0.6);
	this.wobble = Math.random() * Math.PI * 2;
}

Coin.prototype.type = "coin";

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.act = function(step) {
	this.wobble += step * wobbleSpeed;
	var wobblePos = Math.sin(this.wobble) * wobbleDist;
	this.pos = this.basePos.plus(new Vector(0, wobblePos));
};





//////////////////////////////  Helpers  /////////////////////////////////

function elt(name, className){
	var elt = document.createElement(name);
	if (className) elt.className = className;
	return elt;
}


////////////////////////////  DOM Display  ///////////////////////////////

function DOMDisplay(parent, level){
	this.wrap = parent.appendChild(elt("div", "game"));
	this.level = level;
	
	this.wrap.appendChild(this.drawBackground());
	this.actorLayer = null;
	this.drawFrame();
}

var scale = 20;

DOMDisplay.prototype.drawBackground = function() {
	var table = elt("table", "background");
	table.style.width = this.level.width * scale + "px";
	this.level.grid.forEach(function(row) {
		var rowElt = table.appendChild(elt("tr"));
		rowElt.style.height = scale + "px";
		row.forEach(function(type) {
			rowElt.appendChild(elt("td", type));
		});
	});
	
	return table;
};

DOMDisplay.prototype.drawActors = function() {
	var wrap = elt("div");
	this.level.actors.forEach(function(actor) {
		var rect = wrap.appendChild(elt("div", "actor " + actor.type));
		rect.style.width = actor.size.x * scale + "px";
		rect.style.height = actor.size.y * scale + "px";
		rect.style.left = actor.pos.x * scale + "px";
		rect.style.top = actor.pos.y * scale + "px";
	});
	return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
	if (this.actorLayer)
		this.wrap.removeChild(this.actorLayer);
	this.actorLayer = this.wrap.appendChild(this.drawActors());
	this.wrap.className = "game " + (this.level.status || "");
	this.scrollPlayerIntoView();	
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
	var width = this.wrap.clientWidth;
	var height = this.wrap.clientHeight;
	var margin = width / 3;
	var vmargin = height / 3;
	
	//console.log("This Margin " + margin.toFixed(2).toString());
	
	// The Viewport
	var left = this.wrap.scrollLeft, right = left + width;
	var top = this.wrap.scrollTop, bottom = top + height;
	
	var player = this.level.player;
	var center = player.pos.plus(player.size.times(0.5)).times(scale);
	
	
	//console.log("This Player x " + center.x.toFixed(2).toString() + " " + player.pos.x.toFixed(2).toString());
	//console.log(" Bottom " + bottom.toString());
	
	
	if (center.x < left + margin){
		this.wrap.scrollLeft = center.x - margin;
		//console.log("Scroll left");
	}else if (center.x  > right - margin){
		//console.log("Scroll Right");	
		this.wrap.scrollLeft = center.x + margin - width;
	}
	if (center.y < top + vmargin)
		this.wrap.scrollTop = center.y - vmargin;
	else if (center.y > bottom - vmargin){
		this.wrap.scrollTop = center.y + vmargin - height;
		//console.log("Scroll Down");
	}
};

DOMDisplay.prototype.clear = function() {
	this.wrap.parentNode.removeChild(this.wrap);
};

///////////////////////////  SCORE Display  ////////?/////////////////////

function SCOREDisplay(parent, tableHieght, level) {
	this.container = parent.appendChild(elt("div", "scoreing"));
	this.levelGroup = this.container.appendChild(elt("div", "level-group"));
	this.lifeGroup = this.container.appendChild(elt("div", "life-group"));
	this.pausedGroup = this.container.appendChild(elt("div", "paused-group"));
	this.gameOverGroup = this.container.appendChild(elt("div", "game-over-group"));

	this.coinGroup = this.container.appendChild(elt("div", "coin-group"));
	this.level = level;

	this.levelNo = 0;
	this.lives = 0;
	this.coins = 0;
	this.totalCoins = 0;
	
	var levelSymbol = this.drawLevelSymbol();
	this.levelNum = this.drawLevelCount();
	var heart = this.drawHeart();
	var xSymbol = this.drawX();
	this.lifeNum = this.drawLifeNum();
	var coinSymbol = this.drawCoin();
	this.coinNum = this.drawCoinNum();
	var slashSymbol = this.drawSlash();
	this.coinCount = this.drawCoinCount();

	this.gameOver = this.drawGameOver();
	this.paused =  this.drawPaused();
	this.turnOffPause();
	this.turnOffGameOver();
	
	this.container.style.marginTop =  -tableHieght + 10 + "px";

	//this.drawScoreFrame();
	//levelNum.showNum(12);
}

SCOREDisplay.prototype.setLevelNum = function(num) {
	this.levelNo = num;
	this.levelNum.showNum(num);
};

SCOREDisplay.prototype.setLifeNum = function(num) {
	this.lives = num;
	this.lifeNum.showNum(num);
};

SCOREDisplay.prototype.setCoinNum = function(num) {
	this.coins = num;
	this.coinNum.showNum(num);
};

SCOREDisplay.prototype.setCoinCount = function(num) {
	this.totalCoins = num;
	this.coinCount.showNum(num);
};

SCOREDisplay.prototype.turnOnPause = function() {
	this.pausedGroup.style.display = "block";
};

SCOREDisplay.prototype.turnOffPause = function() {
	this.pausedGroup.style.display = "none";
};

SCOREDisplay.prototype.turnOnGameOver = function() {
	this.gameOverGroup.style.display = "block";
};

SCOREDisplay.prototype.turnOffGameOver = function() {
	this.gameOverGroup.style.display = "none";
};


SCOREDisplay.prototype.drawLevelSymbol = function() {
	return new BitMap(LEV, this.levelGroup, "s-level-symbol");
};


SCOREDisplay.prototype.drawLevelCount = function() {
	return new Numeral2(NUMERALS, this.levelGroup, "s-level-count");
};

SCOREDisplay.prototype.drawHeart = function() {
	return new BitMap(HEART, this.lifeGroup, "s-heart");	
};

SCOREDisplay.prototype.drawX= function() {
	return new BitMap(TIMES, this.lifeGroup, "s-x");
};

SCOREDisplay.prototype.drawLifeNum = function() {
	return new Numeral2(NUMERALS, this.lifeGroup, "s-life-num");	
};

SCOREDisplay.prototype.drawCoin = function() {
	return new BitMap(COIN, this.coinGroup, "s-coin");
};

SCOREDisplay.prototype.drawCoinNum = function() {
	return new Numeral2(NUMERALS, this.coinGroup, "s-coin-num");
}; 

SCOREDisplay.prototype.drawSlash = function() {
	return new BitMap(OVER, this.coinGroup, "s-slash");
};

SCOREDisplay.prototype.drawCoinCount = function() {
	return new Numeral2(NUMERALS, this.coinGroup, "s-coin-count");
};

SCOREDisplay.prototype.drawGameOver = function () {
	return new BitMap(GAME_OVER, this.gameOverGroup ,"s-game-over");
};

SCOREDisplay.prototype.drawPaused = function() {
	return new BitMap(PAUSED, this.pausedGroup, "s-paused");
};




var scoreScale = 1;



///////////////////////////  BITMAP  ///////////////////////////////
function BitMap(sbmap, parent, classname) {
	//console.log(typeof parent);
	//console.log(typeof sbmap);
	//sbmap.forEach(function (row) {
	//	console.log (typeof row)});
	this.sfont = sbmap;
	this.bmap = parent.appendChild(this.drawBitmap(classname));
	
	//this.drawBitmap(); 
}

BitMap.prototype.drawBitmap = function (classname) {
	//console.log(typeof sbmap);
	//var rand = LEV[0];
	//console.log(typeof sbmap[0]);
	//console.log(typeof sbmap);
	//this.sfonts.forEach(function (row) {
	//	console.log (typeof row)});
	var width = this.sfont[0].length;
	var table = elt("table", classname);
	table.style.width = width * scoreScale + "px";
	this.sfont.forEach(function(row){
	//	console.log (typeof row)
		rowElt = table.appendChild(elt("tr"));
		rowElt.style.height = scoreScale + "px";
		for (var ch = 0; ch < width; ch++) {
			if(row[ch] == " ")
				rowElt.appendChild(elt("td"));
			else
				rowElt.appendChild(elt("td", row[ch].toString()));
		}
	});
	return table;
};


	

///////////////////////////  NUMERAL  ///////////////////////////////

function Numeral(numbers, parent, classname){
	this.digit = parent.appendChild(elt("div", classname));
	this.digitPixelRows = numbers[0].length;
	this.digit.style.maxHeight = this.digitPixelRows * scoreScale + "px";
	this.numbersSprite = collapse(numbers);
	//console.log(this.numbersSprite);
	this.numStrip = new BitMap(this.numbersSprite, this.digit, "s-num-strip");
	this.showDigit(0);
}

Numeral.prototype.newNumberSprite = function(nums){
	var numStrip = new Array(nums[0]);
	//console.log(nums);
	//console.log(numStrip);
	nums.forEach(function(elm) {numStrip.concat(elm)} );
	//console.log(numStrip);
	return numStrip;
};

function collapse(arr) {
	var elm = arr[0];
	if(arr.length <= 1)
		return elm;
	else
		return elm.concat(collapse(arr.slice(1, arr.length)));
}

Numeral.prototype.showDigit = function(num){
	var offset = Math.floor(num) % 10;
	this.digit.scrollTop = offset * this.digitPixelRows * scoreScale;
};



///////////////////////////  NUMERAL2  //////////////////////////////

function Numeral2(numbers, parent, classname){
	this.pair = parent.appendChild(elt("div", classname));
	this.leftDigit = new Numeral(numbers, this.pair, "s-left-digit");
	this.rightDigit = new Numeral(numbers, this.pair, "s-right-digit");

}

Numeral2.prototype.showNum = function(num){
	var leftVal = Math.floor((num % 100)/10);
	var rightVal = Math.floor(num %10 );

	this.leftDigit.showDigit(leftVal);
	this.rightDigit.showDigit(rightVal);
};







var GAME_LEVELS = [
  ["                                                                                ",
   "                                                                                ",
   "                                                                                ",
   "                                                                                ",
   "                                                                                ",
   "                                                                                ",
   "                                                                  xxx           ",
   "                                                   xx      xx    xx!xx          ",
   "                                    o o      xx                  x!!!x          ",
   "                                                                 xx!xx          ",
   "                                   xxxxx                          xvx           ",
   "                                                                            xx  ",
   "  xx                                      o o                                x  ",
   "  x                     o                                                    x  ",
   "  x                                      xxxxx                             o x  ",
   "  x          xxxx       o                                                    x  ",
   "  x  @       x  x                                                xxxxx       x  ",
   "  xxxxxxxxxxxx  xxxxxxxxxxxxxxx   xxxxxxxxxxxxxxxxxxxx     xxxxxxx   xxxxxxxxx  ",
   "                              x   x                  x     x                    ",
   "                              x!!!x                  x!!!!!x                    ",
   "                              x!!!x                  x!!!!!x                    ",
   "                              xxxxx                  xxxxxxx                    ",
   "                                                                                ",
   "                                                                                "],
  ["                                      x!!x                        xxxxxxx                                    x!x  ",
   "                                      x!!x                     xxxx     xxxx                                 x!x  ",
   "                                      x!!xxxxxxxxxx           xx           xx                                x!x  ",
   "                                      xx!!!!!!!!!!xx         xx             xx                               x!x  ",
   "                                       xxxxxxxxxx!!x         x                                    o   o   o  x!x  ",
   "                                                xx!x         x     o   o                                    xx!x  ",
   "                                                 x!x         x                                xxxxxxxxxxxxxxx!!x  ",
   "                                                 xvx         x     x   x                        !!!!!!!!!!!!!!xx  ",
   "                                                             xx  |   |   |  xx            xxxxxxxxxxxxxxxxxxxxx   ",
   "                                                              xx!!!!!!!!!!!xx            v                        ",
   "                                                               xxxx!!!!!xxxx                                      ",
   "                                               x     x            xxxxxxx        xxx         xxx                  ",
   "                                               x     x                           x x         x x                  ",
   "                                               x     x                             x         x                    ",
   "                                               x     x                             xx        x                    ",
   "                                               xx    x                             x         x                    ",
   "                                               x     x      o  o     x   x         x         x                    ",
   "               xxxxxxx        xxx   xxx        x     x               x   x         x         x                    ",
   "              xx     xx         x   x          x     x     xxxxxx    x   x   xxxxxxxxx       x                    ",
   "             xx       xx        x o x          x    xx               x   x   x               x                    ",
   "     @       x         x        x   x          x     x               x   x   x               x                    ",
   "    xxx      x         x        x   x          x     x               x   xxxxx   xxxxxx      x                    ",
   "    x x      x         x       xx o xx         x     x               x     o     x x         x                    ",
   "!!!!x x!!!!!!x         x!!!!!!xx     xx!!!!!!!!xx    x!!!!!!!!!!     x     =     x x         x                    ",
   "!!!!x x!!!!!!x         x!!!!!xx       xxxxxxxxxx     x!!!!!!!xx!     xxxxxxxxxxxxx xx  o o  xx                    ",
   "!!!!x x!!!!!!x         x!!!!!x    o                 xx!!!!!!xx !                    xx     xx                     ",
   "!!!!x x!!!!!!x         x!!!!!x                     xx!!!!!!xx  !                     xxxxxxx                      ",
   "!!!!x x!!!!!!x         x!!!!!xx       xxxxxxxxxxxxxx!!!!!!xx   !                                                  ",
   "!!!!x x!!!!!!x         x!!!!!!xxxxxxxxx!!!!!!!!!!!!!!!!!!xx    !                                                  ",
   "!!!!x x!!!!!!x         x!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!xx     !                                                  "],
  ["                                                                                                              ",
   "                                                                                                              ",
   "                                                                                                              ",
   "                                                                                                              ",
   "                                                                                                              ",
   "                                        o                                                                     ",
   "                                                                                                              ",
   "                                        x                                                                     ",
   "                                        x                                                                     ",
   "                                        x                                                                     ",
   "                                        x                                                                     ",
   "                                       xxx                                                                    ",
   "                                       x x                 !!!        !!!  xxx                                ",
   "                                       x x                 !x!        !x!                                     ",
   "                                     xxx xxx                x          x                                      ",
   "                                      x   x                 x   oooo   x       xxx                            ",
   "                                      x   x                 x          x      x!!!x                           ",
   "                                      x   x                 xxxxxxxxxxxx       xxx                            ",
   "                                     xx   xx      x   x      x                                                ",
   "                                      x   xxxxxxxxx   xxxxxxxx              x x                               ",
   "                                      x   x           x                    x!!!x                              ",
   "                                      x   x           x                     xxx                               ",
   "                                     xx   xx          x                                                       ",
   "                                      x   x= = = =    x            xxx                                        ",
   "                                      x   x           x           x!!!x                                       ",
   "                                      x   x    = = = =x     o      xxx       xxx                              ",
   "                                     xx   xx          x                     x!!!x                             ",
   "                              o   o   x   x           x     x                xxv        xxx                   ",
   "                                      x   x           x              x                 x!!!x                  ",
   "                             xxx xxx xxx xxx     o o  x!!!!!!!!!!!!!!x                   vx                   ",
   "                             x xxx x x xxx x          x!!!!!!!!!!!!!!x                                        ",
   "                             x             x   xxxxxxxxxxxxxxxxxxxxxxx                                        ",
   "                             xx           xx                                         xxx                      ",
   "  xxx                         x     x     x                                         x!!!x                xxx  ",
   "  x x                         x    xxx    x                                          xxx                 x x  ",
   "  x                           x    xxx    xxxxxxx                        xxxxx                             x  ",
   "  x                           x           x                              x   x                             x  ",
   "  x                           xx          x                              x x x                             x  ",
   "  x                                       x       |xxxx|    |xxxx|     xxx xxx                             x  ",
   "  x                xxx             o o    x                              x         xxx                     x  ",
   "  x               xxxxx       xx          x                             xxx       x!!!x          x         x  ",
   "  x               oxxxo       x    xxx    x                             x x        xxx          xxx        x  ",
   "  x                xxx        xxxxxxxxxxxxx  x oo x    x oo x    x oo  xx xx                    xxx        x  ",
   "  x      @          x         x           x!!x    x!!!!x    x!!!!x    xx   xx                    x         x  ",
   "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxx     xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ",
   "                                                                                                              ",
   "                                                                                                              "],
  ["                                                                                                  xxx x       ",
   "                                                                                                      x       ",
   "                                                                                                  xxxxx       ",
   "                                                                                                  x           ",
   "                                                                                                  x xxx       ",
   "                          o                                                                       x x x       ",
   "                                                                                             o o oxxx x       ",
   "                   xxx                                                                                x       ",
   "       !  o  !                                                xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx       ",
   "       x     x                                                x   x x   x x   x x   x x   x x   x x           ",
   "       x= o  x            x                                   xxx x xxx x xxx x xxx x xxx x xxx x xxxxx       ",
   "       x     x                                                  x x   x x   x x   x x   x x   x x     x       ",
   "       !  o  !            o                                  xxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxxxx       ",
   "                                                                                                              ",
   "          o              xxx                              xx                                                  ",
   "                                                                                                              ",
   "                                                                                                              ",
   "                                                      xx                                                      ",
   "                   xxx         xxx                                                                            ",
   "                                                                                                              ",
   "                          o                                                     x      x                      ",
   "                                                          xx     xx                                           ",
   "             xxx         xxx         xxx                                 x                  x                 ",
   "                                                                                                              ",
   "                                                                 ||                                           ",
   "  xxxxxxxxxxx                                                                                                 ",
   "  x         x o xxxxxxxxx o xxxxxxxxx o xx                                                x                   ",
   "  x         x   x       x   x       x   x                 ||                  x     x                         ",
   "  x  @      xxxxx   o   xxxxx   o   xxxxx                                                                     ",
   "  xxxxxxx                                     xxxxx       xx     xx     xxx                                   ",
   "        x=                  =                =x   x                     xxx                                   ",
   "        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   x!!!!!!!!!!!!!!!!!!!!!xxx!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
   "                                                  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
   "                                                                                                              "]
];

if (typeof module != "undefined" && module.exports)
  module.exports = GAME_LEVELS;


var NUMERALS = [
["dddddddddddddddd",
 "dddddddddddddddd",
 "dd            dd",
 "dd            dd",
 "dd            dd",
 "dd            dd",
 "dd            dd",
 "dd            dd",
 "dddddddddddddddd",
 "dddddddddddddddd"],
 
["      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        ",
 "      dd        "],
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "dd              ",
 "dd              ",
 "dddddddddddddddd",
 "dddddddddddddddd"],
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "dddddddddddddddd",
 "dddddddddddddddd"],
 
["dd            dd",
 "dd            dd",
 "dd            dd",
 "dd            dd",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "              dd",
 "              dd"],  
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "dd              ",
 "dd              ",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "dddddddddddddddd",
 "dddddddddddddddd"],
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "dd              ",
 "dd              ",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "dd            dd",
 "dd            dd",
 "dddddddddddddddd",
 "dddddddddddddddd"],
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "              dd",
 "              dd",
 "              dd",
 "              dd",
 "              dd",
 "              dd"],
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "dd            dd",
 "dd            dd",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "dd            dd",
 "dd            dd",
 "dddddddddddddddd",
 "dddddddddddddddd"],
 
["dddddddddddddddd",
 "dddddddddddddddd",
 "dd            dd",
 "dd            dd",
 "dddddddddddddddd",
 "dddddddddddddddd",
 "              dd",
 "              dd",
 "dddddddddddddddd",
 "dddddddddddddddd"] 
];

var LEV = [
"dd              ",
"dd              ",
"dd              ",
"dd              ",
"dd              ",
"dd              ",
"dd              ",
"dd              ",
"dddddddddddddddd",
"dddddddddddddddd"
];

var TIMES = [
"            ",
"            ",
"            ",
"            ",
"  xx  xx    ",
"  xx  xx    ",
"    xx      ",
"    xx      ",
"  xx  xx    ",
"  xx  xx    "
];

var OVER = [
"            ",
"            ",
"            ",
"            ",
"      xx    ",
"      xx    ",
"    xx      ",
"    xx      ",
"  xx        ",
"  xx        "
];

var HEART = [
"                ",
"                ",
"  rwrr    rrrr  ",
"rrwwwrrrrrrrrrrr",
"rrrwrrrrrrrrrrrr",
"  rrrrrrrrrrrr  ",
"    rrrrrrrr    ",
"      rrrr      ",
"                ",
"                "
];

var COIN = [
"      gggg    ",
"     gggggg   ",
"     ggwwgg   ",
"    ggwggbgg  ",
"    ggwggbgg  ",
"    ggwggbgg  ",
"     ggbbgg   ",
"     gggggg   ",
"      gggg    ",
"              "
];

var PAUSED = [
"dddddddddddddddd  dddddddddddddddd  dd            dd  dddddddddddddddd  dddddddddddddddd  ddddddddddddddd ",
"dddddddddddddddd  dddddddddddddddd  dd            dd  dddddddddddddddd  dddddddddddddddd  dddddddddddddddd",
"dd            dd  dd            dd  dd            dd  dd                dd                dd            dd",
"dd            dd  dd            dd  dd            dd  dd                dd                dd            dd",
"dddddddddddddddd  dddddddddddddddd  dd            dd  dddddddddddddddd  dddddddddddddddd  dd            dd",
"dddddddddddddddd  dddddddddddddddd  dd            dd  dddddddddddddddd  dddddddddddddddd  dd            dd",
"dd                dd            dd  dd            dd                dd  dd                dd            dd",
"dd                dd            dd  dd            dd                dd  dd                dd            dd",
"dd                dd            dd  dddddddddddddddd  dddddddddddddddd  dddddddddddddddd  dddddddddddddddd",
"dd                dd            dd  dddddddddddddddd  dddddddddddddddd  dddddddddddddddd  ddddddddddddddd "
];

var GAME_OVER = [
"dddddddddddddddd  dddddddddddddddd  dddddddddddddddddd  dddddddddddddddd    dddddddddddddddd  dd              dd  dddddddddddddddd  dddddddddddddddd",
"dddddddddddddddd  dddddddddddddddd  dddddddddddddddddd  dddddddddddddddd    dddddddddddddddd  dd              dd  dddddddddddddddd  dddddddddddddddd",
"dd                dd            dd  dd      dd      dd  dd                  dd            dd  dd              dd  dd                dd            dd",
"dd                dd            dd  dd      dd      dd  dd                  dd            dd   dd            dd   dd                dd            dd",
"dd    dddddddddd  dddddddddddddddd  dd      dd      dd  dddddddddddddddd    dd            dd    dd          dd    dddddddddddddddd  dd            dd",
"dd    dddddddddd  dddddddddddddddd  dd      dd      dd  dddddddddddddddd    dd            dd     dd        dd     dddddddddddddddd  dddddddddddddddd",
"dd            dd  dd            dd  dd      dd      dd  dd                  dd            dd      dd      dd      dd                dddddddddddddddd",
"dd            dd  dd            dd  dd      dd      dd  dd                  dd            dd       dd    dd       dd                dd          dd  ",
"dddddddddddddddd  dd            dd  dd      dd      dd  dddddddddddddddd    dddddddddddddddd        dddddd        dddddddddddddddd  dd           dd ",
"dddddddddddddddd  dd            dd  dd      dd      dd  dddddddddddddddd    dddddddddddddddd         dddd         dddddddddddddddd  dd            dd"
];
