$(function(){
    player = new Engine.Player();
    map = new Engine.Map({
        width: 1600,
        height: 1600,
        startx: 100,
        starty: 0,
        subject: player
    });

    var update = function(){
        player.update();
        map.update();
    };

    var draw = function(){
        player.draw();
        map.draw();
    };
    Engine.start({
        level: map,
        player: player,
        updateFunction: update,
        drawFunction: draw
    });
    /*$('canvas').click(function(){
        inputArray.push('right');
        keydown['right'] = true;
    });*/
});