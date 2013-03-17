$(function(){
    var player = new Engine.Player();
    var map = new Engine.Map({
        width: 1600,
        height: 1600,
        startx: 0,
        starty: 0,
        subject: player/*,
        name: "secondMap"*/
    });
    var camera = new Engine.Camera( player, map );
    var update = function(){
        camera.updateScene();
    };

    var draw = function(){
        camera.drawScene();
    };
    Engine.start({
        level: map,
        player: player,
        updateFunction: update,
        drawFunction: draw
    });

    // Simple test for touch-devices
    /*$('canvas').click(function(){
        inputArray.push('right');
        keydown['right'] = true;
    });*/
});