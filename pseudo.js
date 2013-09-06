

var circles = {};

var queueOfChanges = [
  {id,x,y,diff},
];

function ajaxPoll() {
   var changed = getChanges();
    queueOfChanges = queueOfChanges.concat(changed)
}


function applyChange(change) {
  animateChange(change).then(function() {
    circles[change.id].score += change.diff
    visualiseCircles()
  })
}




Source = {
}

Source.on("circle",function(circle) {
  circles[circle.id] = circle;
})
Source.on("exit",function(circle) {
  delete circles[circle.id];
})
Source.on("change",function() {
  animateChange(
})
