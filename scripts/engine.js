////
//  Prototyping and shims
////
/**
 *
 * @param min
 * @param max
 * @returns {number}
 */
Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};
/**
 *
 * @param min
 * @param max
 * @returns {*}
 */
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
            return window.setTimeout(callback, 1000 / 60);
        };
})();
window.cancelRequestAnimFrame = ( function() {
    return window.cancelAnimationFrame           ||
        window.webkitCancelRequestAnimationFrame ||
        window.mozCancelRequestAnimationFrame    ||
        window.oCancelRequestAnimationFrame      ||
        window.msCancelRequestAnimationFrame     ||
        clearTimeout
} )();
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
    /**
     *
     * @param options
     * @returns {CanvasRenderingContext2D}
     */
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
    /**
     *
     * @param context
     */
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

    //Calculates which tile the given coordinate is on
    /**
     *
     * @param pixelPosition
     * @returns {{x: number, y: number}}
     */
    function pixelsToTile( pixelPosition )
    {
        return {x: Math.round( pixelPosition.x/TILE_WIDTH), y: Math.round( pixelPosition.y/TILE_HEIGHT)};
    }

    function tilesToPixel( tilePosition )
    {
        console.log(tilePosition);
        if( $.isArray(tilePosition) )
        {
            return {x: tilePosition[0] * TILE_WIDTH, y: tilePosition[1] * TILE_HEIGHT};
        }
        return {x: tilePosition.x * TILE_WIDTH, y: tilePosition.y * TILE_HEIGHT};
    }

    //executes the specified update operations, then calculates delta (improve timer precision), recursive
    function update(){
        Engine.updateGame();
        var delta = (new Date().getTime() - this.oldTime)/1000;
        this.oldTime = new Date().getTime();
        this.updateInstance = setTimeout( update, FRAMETIME - delta );
    }

    //Executes the specified draw operations, then calls itself with a RAF-shim
    function draw(){
        Engine.drawGame();
        this.drawInstance = requestAnimFrame( draw );
    }

    function startGame(){
        $(window).on('blur', function(){
            window.keydown = {};
            inputArray = [];
        });
        this.oldTime = new Date().getTime();
        update();
        draw();
    }

    ////
    // Maps
    ////
    /**
     *
     * @param options
     * @returns {*}
     * @constructor
     */
    this.Map = function( options ){
        var defaultOptions = this.getDefaultOptions();
        options = (typeof options == 'object') ? $.extend(defaultOptions, options) : defaultOptions;

        this.name = options.name;
        this.width = MAPS[options.name].width;
        this.height = MAPS[options.name].height;
        this.bgCanvas = createCanvas({
            zIndex: 0
        });
        this.fgCanvas = createCanvas({
            zIndex: 2
        });
        this.layers = [];
        this.exits = MAPS[this.name].exits;
        return this;
    };
    /**
     *
     * @returns {{width: Number, height: Number, name: string}}
     */
    this.Map.prototype.getDefaultOptions = function(){
        return{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            name: DEFAULT_MAP
        };
    };
    /**
     *
     * @param translate
     */
    this.Map.prototype.draw = function( translate ){
        this.bgCanvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.fgCanvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.bgCanvas.drawImage(
            this.layers[TYPE_BG],
            -translate.x,
            -translate.y,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            0,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT
        );
        this.fgCanvas.drawImage(
            this.layers[TYPE_FG],
            -translate.x,
            -translate.y,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            0,
            0,
            CANVAS_WIDTH,
            CANVAS_HEIGHT
        );
        this.bgCanvas.translate( translate.x, translate.y );
        this.fgCanvas.translate( translate.x, translate.y);
    };
    this.Map.prototype.loadMap = function(exit){
        this.name = exit.destination;
        this.width = MAPS[exit.destination].width;
        this.height = MAPS[exit.destination].height;
        this.exits = MAPS[exit.destination].exits;
        this.preload();
    };
    this.Map.prototype.getExit = function(location){
        var locationArray = [location.x, location.y];
        var matches;
        for(var x in this.exits ){
            for( var i = 0; i < this.exits[x].location.length; i++){
                matches = 0;
                for( var j=0; j<this.exits[x].location[i].length; j++){
                    if( this.exits[x].location[i][j] == locationArray[j]){
                        matches++;
                    }
                }
                if( matches == this.exits[x].location[i].length){
                    return {exit: this.exits[x], index: i};
                }
            }
        }
        console.log('crap!');
    };
    //Move this to camera?


    /**
     *
     * @param onComplete
     */
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
            if( typeof(onComplete) == "function" ){
                onComplete();
            }
        });
    };

    ////
    // Player
    ////
    /**
     *
     * @param options
     * @returns {*}
     * @constructor
     */
    this.Player = function( options ){
        var defaultOptions = this.getDefaultOptions();
        options = (typeof options == 'object') ? $.extend(defaultOptions, options) : defaultOptions;
        this.x = options.x;
        this.y = options.y;
        this.prevx = this.x;
        this.prevy = this.y;
        this.height = options.height;
        this.width = options.width ;
        this.speed = options.speed;
        this.canSwim = options.canSwim;
        this.collisions = {left: false, right: false, up: false, down: false};
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
                this.x -= (!this.collisions.left) ? this.speed : 0;
                if( inputArray.lastItem() == "left" )
                    this.sprite.setAnimation( {name: 'left', fps: 6 } );
            }

            if( keydown.right && !keydown.left ){
                this.x += (!this.collisions.right) ? this.speed : 0;
                if( inputArray.lastItem() == "right" )
                    this.sprite.setAnimation( {name: 'right', fps: 6 } );
            }

            if( keydown.up && !keydown.down ){
                this.y -= (!this.collisions.up) ? this.speed : 0;
                if( inputArray.lastItem() == "up" )
                    this.sprite.setAnimation( {name: 'up', fps: 6 } );
            }

            if( keydown.down && !keydown.up ){
                this.y += (!this.collisions.down) ? this.speed : 0;
                if( inputArray.lastItem() == "down" )
                    this.sprite.setAnimation( {name: 'down', fps: 6 } );
            }

            this.sprite.updateSprite();
        }

        //Previous position (needed later?)
        this.prevx = this.x;
        this.prevy = this.y;
    };
    /**
     *
     * @param translate
     */
    this.Player.prototype.draw = function( translate ){
        this.canvas.translate( translate.x, translate.y );
        this.canvas.clearRect(this.x-5, this.y-5, this.width+10, this.height+10);
        this.sprite.drawSprite(this.canvas, this.x, this.y);
    };

    ////
    // Animated Sprites
    ////
    /**
     *
     * @param options
     * @returns {*}
     * @constructor
     */
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
    /**
     *
     * @param sets
     * @returns {*}
     */
    this.AnimatedSprite.prototype.setAnimationSets = function( sets ){
        this.sets = sets;
        return this;
    };
    /**
     *
     * @param options
     * @returns {*}
     */
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
    /**
     *
     * @param canvas
     * @param dx
     * @param dy
     * @returns {*}
     */
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

    ////
    // Camera - links maps and subject (player) together
    ////
    /**
     *
     * @param subject
     * @param map
     * @constructor
     */
    this.Camera = function( subject, map ){
        this.subject = subject;
        this.map = map;
        this.translate = {x: 0, y: 0};
    };

    this.Camera.prototype.update = function(){
        this.translate.x = -this.subject.x.clamp(CANVAS_WIDTH/2, this.map.width - CANVAS_WIDTH/2) + CANVAS_WIDTH/2;
        this.translate.y = -this.subject.y.clamp(CANVAS_HEIGHT/2, this.map.height - CANVAS_HEIGHT/2) + CANVAS_HEIGHT/2;
    };

    this.Camera.prototype.checkCollisions = function(){
        var tiles = {
            left: pixelsToTile({
                x: this.subject.x - this.subject.speed,
                y: this.subject.y
            }),
            right: pixelsToTile({
                x:this.subject.x + this.subject.speed,
                y: this.subject.y
            }),
            up: pixelsToTile({
                x:this.subject.x,
                y: this.subject.y - this.subject.speed
            }),
            down: pixelsToTile({
                x:this.subject.x ,
                y:this.subject.y + this.subject.speed
            })
        };

        for( var x in tiles )
        {
            switch(this.map.layers[TYPE_COL].data[(tiles[x].x) + this.map.layers[TYPE_COL].width*(tiles[x].y)])
            {
                case CTILE:
                    this.subject.collisions[x] = true;
                    break;
                case WTILE:
                    this.subject.collisions[x] = !this.subject.canSwim;
                    break;
                default:
                    this.subject.collisions[x] = false;
                    break;
            }
        }
        return this.subject.collisions;
    };

    this.Camera.prototype.checkExits = function(){
        var tilePosition = pixelsToTile({x: this.subject.x, y:this.subject.y});
        var dataIndex = tilePosition.x + this.map.layers[TYPE_COL].width * tilePosition.y;
        if( this.map.layers[TYPE_COL].data[dataIndex] == ETILE){
           this.changeLevel(tilePosition);
        }
    };

    this.Camera.prototype.changeLevel = function(tilePosition){
        var locationData = this.map.getExit(tilePosition);
        var spawnLocation = tilesToPixel( MAPS[locationData.exit.destination].exits[locationData.exit.destinationSpawn].spawnLocation[locationData.index] );
        this.map.loadMap(locationData.exit);
        this.subject.x = spawnLocation.x;
        this.subject.y = spawnLocation.y;
        this.subject.canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };
    this.Camera.prototype.updateScene = function(){
        this.checkCollisions();
        this.checkExits();
        this.subject.update();
        this.translate.x = -this.subject.x.clamp(CANVAS_WIDTH/2, this.map.width - CANVAS_WIDTH/2) + CANVAS_WIDTH/2;
        this.translate.y = -this.subject.y.clamp(CANVAS_HEIGHT/2, this.map.height - CANVAS_HEIGHT/2) + CANVAS_HEIGHT/2;
    };

    this.Camera.prototype.drawScene = function(){
        this.map.bgCanvas.save();
        this.map.fgCanvas.save();
        this.subject.canvas.save();

        this.map.draw(this.translate);
        this.subject.draw(this.translate);

        this.map.bgCanvas.restore();
        this.map.fgCanvas.restore();
        this.subject.canvas.restore();
    }
};