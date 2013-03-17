////
//  Prototyping and shims
////
Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

Array.prototype.lastItem = function(min, max){
    return this[this.length - 1];
};
/**
 * requestAnim shim layer by Paul Irish
 * Finds the first API that works to optimize the animation loop,
 * otherwise defaults to setTimeout().
 */
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame   ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
        };
})();
////
// Global constants
////
const CANVAS_WIDTH = window.innerWidth <= 1280 ? window.innerWidth : 1280;
const CANVAS_HEIGHT = window.innerHeight <= 720 ? window.innerHeight: 720;

const FPS = 60;
const FRAMETIME = Math.ceil(1000/FPS);
const CANVAS_CONTAINER = '.content';
const DEFAULT_MAP = 'firstMap';
const MOVEMENT_SPEED = 2;

////
// Input Handling
// TODO:: This can probably be improved significantly.
////
const BLOCKED_KEYS = ['up', 'down', 'left', 'right', 'space'];
var inputArray = [];

//Capture all keys, filter on BLOCKED_KEYS, keydown[] contains currently "held down" keys.
$(function() {
    window.keydown = {};
    function getKeyName(event) {
        return jQuery.hotkeys.specialKeys[event.which]  ||
            String.fromCharCode(event.which).toLowerCase();
    }

    $(document).bind("keydown", function(event) {
        var n=getKeyName(event);
        if( BLOCKED_KEYS.indexOf(n) != -1)
        {
            if( inputArray.indexOf(n) == -1 )
            {
                inputArray.push(n);
                keydown[n] = true;
            }
            event.preventDefault();
        }
    });
    $(document).bind("keyup", function(event) {
        var n=getKeyName(event);
        if( BLOCKED_KEYS.indexOf(n) != -1 )
        {
            var index = inputArray.indexOf(n)
            if (index != -1)
            {
                inputArray.splice(index, 1);
                keydown[n] = false;
            }
            event.preventDefault();
        }
    });
});

var Engine = new function(){
    this.start = function( options ){
        this.updateGame = options.updateFunction;
        this.drawGame = options.drawFunction;
        options.level.preload( function(){
            startGame();
        });
    };
    ////
    // General functions
    ////

    //Creates a canvas and adds it to the specified container
    function createCanvas( options ){
        var defaultOptions = {
            height: CANVAS_HEIGHT,
            width: CANVAS_WIDTH,
            alpha: 1,
            zIndex: 0,
            id: 'canvas' + $('canvas').length
        };
        options = (typeof options == 'object') ? $.extend(defaultOptions, options) : defaultOptions;
        var canvas = document.createElement('canvas');
        canvas.height = options.height;
        canvas.width = options.width;
        canvas.globalAlpha = options.alpha;
        $(canvas).css( 'z-index', ( options.zIndex ) );
        $(canvas).attr('id', ( options.id ));
        $(CANVAS_CONTAINER).append(canvas);
        $(canvas).css('left', ( options.hasOwnProperty('offScreen') ) ? '-9999px' : 'auto');
        return canvas.getContext('2d');
    }

    //Removes the given canvas
    function removeCanvas( context ){
        $(context.canvas).remove();
    }

    //Makes a new canvas on the top layer to hide the game while loading
    function showLoadingScreen(){
        var preloadCanvas = createCanvas({
            zIndex: 9999,
            id: "preloading"
        });
        preloadCanvas.fillStyle = '#fff';
        preloadCanvas.font = '50px Helvetica';
        preloadCanvas.fillText('Loading...', CANVAS_WIDTH/2-75, (CANVAS_HEIGHT)/2);
        preloadCanvas.fill();
        preloadCanvas.stroke();
        return preloadCanvas;
    }

    //Removes the loading overlay
    function clearLoadingScreen( preloadCanvas ){
        removeCanvas(preloadCanvas);
    }

    //executes the specified update operations, then calculates delta (improve timer precision), recursive
    function update(){
        Engine.updateGame();
        Engine.drawGame();
        var delta = (new Date().getTime() - this.oldTime)/1000;
        this.oldTime = new Date().getTime();
        setTimeout( update, FRAMETIME - delta );
    }

    //Executes the specified draw operations, then calls itself with a RAF-shim
    function draw(){
        Engine.drawGame();
        requestAnimFrame( draw );
    }

    function startGame(){
        this.oldTime = new Date().getTime();
        update();
        draw();
    }
    ////
    // Maps
    ////
    //TODO: move height/width to maps.js?
    this.Map = function( options ){
        var defaultOptions = this.getDefaultOptions();
        options = (typeof options == 'object') ? $.extend(defaultOptions, options) : defaultOptions;

        this.width = options.width;
        this.height = options.height;
        this.bgCanvas = createCanvas({
            zIndex: 0
        });
        this.fgCanvas = createCanvas({
            zIndex: 2
        });
        //Read these from colArray
        this.x = -options.startx;
        this.y = -options.starty;
        this.prevx = 0;
        this.prevy = 0;
        this.name = options.name;
        this.speed = options.speed;
        this.layers = [];
        this.subject = options.subject;
        this.collisions = {left: false, right: false, up: false, down: false};
        return this;
    };
    this.Map.prototype.getDefaultOptions = function(){
        return{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            startx: 0,
            starty: 0,
            name: DEFAULT_MAP,
            speed: MOVEMENT_SPEED
        };
    };
    this.Map.prototype.preload = function( onComplete ){
        var loadingScreen = showLoadingScreen();
        var operations = MAPS[this.name].paths;
        var promises = [];
        var destinationArray = this.layers;

        for (var i = 0; i < operations.length; i++) {
            (function(url, promise) {
                if( url.split('.').pop() == "png")
                {
                    var img = new Image();
                    img.onload = function() {
                        promise.resolve();
                    };
                    img.src = url;
                    destinationArray[i] = img;
                }
                else if( url.split('.').pop() == "json")
                {
                    $.ajax({
                        url: url,
                        cache: false,
                        success: function(response){
                            destinationArray[TYPE_COL] = response;
                            promise.resolve();
                        }
                    });
                }
            })(operations[i], promises[i] = $.Deferred());
        }
        $.when.apply($, promises).done(function() {
            clearLoadingScreen(loadingScreen);
            onComplete();
        });
    };

    this.Map.prototype.getSubjectPosition = function(){
        return {
            x: this.x - this.subject.x - this.subject.width,
            y: this.y - this.subject.y - this.subject.height
        }
    };

    this.Map.prototype.pixelsToTile = function( pixelPosition )
    {
        return {x: Math.round( pixelPosition.x/TILE_WIDTH)+1, y: Math.round( pixelPosition.y/TILE_HEIGHT)+1};
    };

    this.Map.prototype.checkCollisions = function(){
        var pixelPosition = this.getSubjectPosition();
        var tiles = {
            left: this.pixelsToTile({x:pixelPosition.x + MOVEMENT_SPEED, y: pixelPosition.y}),
            right: this.pixelsToTile({x:pixelPosition.x - MOVEMENT_SPEED, y: pixelPosition.y}),
            up: this.pixelsToTile({x:pixelPosition.x, y: pixelPosition.y + MOVEMENT_SPEED}),
            down: this.pixelsToTile({x:pixelPosition.x ,y:pixelPosition.y - MOVEMENT_SPEED})
        };
        for( var x in tiles )
        {
            switch(this.layers[TYPE_COL].data[(-tiles[x].x) + this.layers[TYPE_COL].width*(-tiles[x].y)])
            {
                case CTILE:
                    this.collisions[x] = true;
                    break;
                case WTILE:
                    this.collisions[x] = !this.subject.canSwim;
                    break;
                default:
                    this.collisions[x] = false;
                    break;
            }
        }
        return this.collisions;
    };
    this.Map.prototype.moveBackground = function(direction){
        switch(direction){
            case 'x':
                if( keydown.left && !this.collisions.left ){
                    this.x += this.speed;
                }
                if( keydown.right && !this.collisions.right ){
                    this.x -= this.speed;
                }
                this.x = this.x.clamp(-(this.width - CANVAS_WIDTH), 0);
                break;
            case 'y':
                if( keydown.up && !this.collisions.up ){
                    this.y += this.speed;
                }
                if( keydown.down && !this.collisions.down ){
                    this.y -= this.speed;
                }
                this.y = this.y.clamp(-(this.height - CANVAS_HEIGHT), 0);
                break;
        }
    };

    this.Map.prototype.update = function(){
        this.checkCollisions();
        if( this.subject.x == CANVAS_WIDTH/2 )
        {
            this.moveBackground( 'x' );
        }
        if( this.subject.y == CANVAS_HEIGHT/2 )
        {
            this.moveBackground( 'y' );
        }
        this.subject.speedx = ( ( (keydown.left && !this.collisions.left) || (keydown.right && !this.collisions.right)) &&  ( this.x == -(this.width - CANVAS_WIDTH) || this.x ==  0) ) ? this.speed : 0;
        this.subject.speedy = ( ( (keydown.up && !this.collisions.up) || (keydown.down && !this.collisions.down) ) && ( this.y == -(this.height - CANVAS_HEIGHT) || this.y == 0) ) ? this.speed : 0;
    };

    this.Map.prototype.draw = function(){
        if( this.prevx != this.x || this.prevy != this.y )
        {
            this.fgCanvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.fgCanvas.drawImage(
                this.layers[TYPE_FG],
                -this.x,
                -this.y,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
                0,
                0,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
            );
            this.bgCanvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.bgCanvas.drawImage(
                this.layers[TYPE_BG],
                -this.x,
                -this.y,
                CANVAS_WIDTH,
                CANVAS_HEIGHT,
                0,
                0,
                CANVAS_WIDTH,
                CANVAS_HEIGHT
            );
            this.prevx = this.x;
            this.prevy = this.y;
        }
    };
    ////
    // Player
    ////
    this.Player = function( options ){
        var defaultOptions = this.getDefaultOptions();
        options = (typeof options == 'object') ? $.extend(defaultOptions, options) : defaultOptions;
        this.x = options.x;
        this.y = options.y;
        this.prevx = this.x;
        this.prevy = this.y;
        this.height = options.height;
        this.width = options.width ;
        this.speedx = 0;
        this.speedy = 0;
        this.canSwim = options.canSwim;
        this.canvas = createCanvas({
            zIndex: 1
        });

        this.sprite = new Engine.AnimatedSprite({
            source: options.image,
            rows: options.spriteRows ,
            cols: options.spriteCols,
            width: options.spriteWidth,
            height: options.spriteHeight,
            sets: options.spriteSets
        });
        return this;
    };
    this.Player.prototype.getDefaultOptions = function(){
        return {
            x: CANVAS_WIDTH/2,
            y: CANVAS_HEIGHT/2,
            height: 32,
            width: 32,
            canSwim: false,
            image: 'images/player.png',
            spriteRows: 4,
            spriteCols: 3,
            spriteWidth: 96,
            spriteHeight: 128,
            speed: MOVEMENT_SPEED,
            spriteSets: {
                'left': {name: 'left', from: 3, until:5},
                'right': {name: 'right', from:6, until:8},
                'up': {name:'up', from:9, until:11},
                'down': {name:'down', from:0, until:2 }
            }
        };

    };
    this.Player.prototype.update = function(){
        if( inputArray.length > 0 )
        {
            if( keydown.left && !keydown.right ){
                this.x -= this.speedx;
                if( inputArray.lastItem() == "left" )
                    this.sprite.setAnimation( {name: 'left', fps: 6 } );
            }
            if( keydown.right && !keydown.left ){
                this.x += this.speedx;
                if( inputArray.lastItem() == "right" )
                    this.sprite.setAnimation( {name: 'right', fps: 6 } );
            }
            if( keydown.up && !keydown.down ){
                this.y -= this.speedy;
                if( inputArray.lastItem() == "up" )
                    this.sprite.setAnimation( {name: 'up', fps: 6 } );
            }
            if( keydown.down && !keydown.up ){
                this.y += this.speedy;
                if( inputArray.lastItem() == "down" )
                    this.sprite.setAnimation( {name: 'down', fps: 6 } );
            }
            this.sprite.updateSprite();
        }

        //Previous position (needed later?)
        this.prevx = this.x;
        this.prevy = this.y;
    };
    this.Player.prototype.draw = function(){
        this.canvas.clearRect(this.x-5, this.y-5, this.width+10, this.height+10);
        this.sprite.drawSprite(this.canvas, this.x, this.y);
    };
    ////
    // Animated Sprites
    ////
    this.AnimatedSprite = function( options ){
        this.source = new Image();
        this.source.src = options.source;
        this.rows = options.rows;
        this.cols = options.cols;
        this.frameWidth = options.width/this.cols;
        this.frameHeight = options.height/this.rows;
        this.currentFrame = 1;
        this.currentTimer = 0;
        this.paused = false;
        this.currentSet = false;
        this.sets = options.hasOwnProperty('sets') ? options.sets : [];
        return this;
    };

    this.AnimatedSprite.prototype.setAnimationSets = function( sets ){
        this.sets = sets;
        return this;
    };

    this.AnimatedSprite.prototype.setAnimation = function( options ){
        if( this.currentSet.name != options.name ){
            this.currentTimer = 0;
            this.currentSet = this.sets[options.name];
            this.currentFrame = 0;
            this.updateTimer = 1000/options.fps;
            this.paused = false;
        }
        return this;
    };

    this.AnimatedSprite.prototype.updateSprite = function(){
        if( !this.paused )
        {
            this.currentTimer += FRAMETIME;
            if( this.currentTimer >= this.updateTimer )
            {
                this.currentFrame = (this.currentFrame + 1) % (this.currentSet.until + 1 - this.currentSet.from);
                this.currentTimer = this.currentTimer - this.updateTimer;
            }
        }
        return this;
    };

    this.AnimatedSprite.prototype.drawSprite = function( canvas, dx, dy)
    {
        canvas.drawImage(
            this.source,
            this.frameWidth*Math.floor( ( (this.currentFrame + this.currentSet.from)%this.cols) ), /*sourceX*/
            this.frameHeight*Math.floor( ( (this.currentFrame + this.currentSet.from)/this.cols) ), /*sourceY*/
            this.frameWidth,
            this.frameHeight,
            dx,
            dy,
            this.frameWidth,
            this.frameHeight);
        return this;
    };
};