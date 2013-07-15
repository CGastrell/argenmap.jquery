var sections = $('section');
var lists = $('nav li').on('click', function () {
    var self = $(this);
    // ???????????
    if (self.hasClass('active')) {
        return;
    }
    // ???????index???
    var from_idx = lists.filter('.active').removeClass('active').index();
    self.addClass('active');

    // ??????????
    //sections.pageChange(from_idx, self.index());
});

// ??????????
var coords = [
    {x: 0, y: 0}, //face1
    {x: 0, y:-180}, // face 4,
    {x: 90, y: -180}, // face6
    {x: -90, y: 0}, // face2
    {x: 0, y: 90},  // face5
    {x: 0, y: -90} // face3
];
var testElement = document.createElement('div');
var transformProperty = judge(testElement,  ['transform', 'WebkitTransform', 'MozTransform', 'OTransform']);
var transitionDurationProperty = judge(testElement, ['transitionDuration', 'WebkitTransitionDuration',  'MozTransitionDuration', 'OTransitionDuration',  'msTransitionDuration']);
    
function judge(elm, props) {
    for(var i = 0, l = props.length; i < l; i++) {
        if(typeof elm.style[props[i]] !== "undefined") {
            return props[i];
        }
    }
}

var  container = {
    x: -10, 
    y: 20, 
    el: $('#cube')[0],
    move: function(coords) {
        if(coords) {
            if(typeof coords.x === "number") this.x = coords.x;
            if(typeof coords.y === "number") this.y = coords.y;
        }

        this.el.style[transformProperty] = "rotateX("+this.x+"deg) rotateY("+this.y+"deg)";
    },
    reset: function() {
        this.move({x: 0, y: 0});
    }
};
        
container.duration = function() {
    container.el.style[transitionDurationProperty] = "250ms";
    return 250;
}();

$('a.jump').click(function(e){
    var to_idx = $(this).attr('to');
    container.move(coords[to_idx]);
});
