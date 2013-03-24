$(function(){
    var player = new Engine.Player({x: 1024, y: 1024});
    var map = new Engine.Map({
        width: 1600,
        height: 1600,
        subject: player
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