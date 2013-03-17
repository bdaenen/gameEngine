/**
 * This file holds the meta-tiles ID and the paths to the layers
 * Collision goes first, then bg, then fg!
 */
const TYPE_COL = 0;
const TYPE_BG = 1;
const TYPE_FG = 2;
const CTILE = 257;
const WTILE = 258;
const ETILE = 259;
const TILE_HEIGHT = 32;
const TILE_WIDTH = 32;

//Paths is currently an array so we can use jQuery Deferred for preloading, improve.
const MAPS = {
    firstMap: {
        paths: [
            "maps/firstMap/firstMap.json",
            "maps/firstMap/firstMap.png",
            "maps/firstMap/firstMap_objects.png"
        ],
        transitions: {
            south: {
                location: [[18,49], [19,49], [20,49], [21,49]],
                destination: "secondMap"
            }
        }
    },
    secondMap: {
        paths: [
            "maps/secondMap/secondMap.json",
            "maps/secondMap/secondMap.png",
            "maps/secondMap/secondMap_objects.png"
        ],
        transitions: {
            north: {
                location: [[18,0], [19,0], [20,0], [21,0]],
                destination: "firstMap"
            }
        }
    }
};