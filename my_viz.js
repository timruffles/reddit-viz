function main() {
  pollSource("http://www.reddit.com/.json?jsonp={callback}",
      _.compose(visualize,subredditUpdater()));
}

function pollSource(url,cb,n) {
  if(n == null) n = 2000;
  var run = function() {
    d3.jsonp(url,cb);
    setTimeout(run,n);
  }
  run();
}

// using pack layout - this will transform
// our data with r - radius, and x and y
var packLayout = d3.layout.pack()
  .value(function(d) {
    return d.score
  })
  .children(function(data) {
    if(!data.children) return [];
    return data.children;
  })
  .sort(function(a,b) {
    a = a.id, b = b.id;
    if(a === b) return 0;
    return a > b ? 1 : -1;
  });

function visualize(redditActivitySources) {

  var el = document.querySelector("#viz");
  var rect = el.getBoundingClientRect();
  var dimMax = Math.min(rect.width,rect.height);
  var dimScale = d3.scale.linear().range([0,dimMax]);

  var sizedPack = packLayout.size([dimMax,dimMax]).padding(dimMax/100);

  var packed = sizedPack.nodes({children: redditActivitySources})[0];
  var nodes = packed.children;

  var scoreRadius = function(d) { return d.r }

  var sources = d3.select("#viz")
    .selectAll(".source")
    .data(nodes,function(data,index) {
      return data.id;
    });

  sources
    .transition()
    .select("circle")
    .attr("r",scoreRadius);

  var setTransform = function(d,i) {
    return "translate(" + (d.x) + "," + (d.y) + ")";
  };

  sources
    .transition(250)
    .attr("transform",setTransform);

  sources
    .classed("increase",function(data) {
      if(!data.previous) return false;
      return data.previous.score < data.score;
    })

  var sourcesEntering = sources
    .enter()
      .append("g")
      .classed("source",true)
      .attr("transform",setTransform);

  sourcesEntering
    .append("circle")
    .attr("r",scoreRadius);

  // sources is now UPDATE & ENTER
  
  sourcesEntering
    .append("text")
    .attr("dx",0)
    .attr("dy",0)
    .text(function(d) { return d.title });

}

function subredditUpdater() {
  var previous = false;
  var newPrevious;
  return function(rawData) {
    previous = newPrevious;
    var formatted = formatSingleSubreddit(rawData);
    newPrevious = _.reduce(formatted,function(prev,item) {
      prev[item.id] = item;
      return prev;
    },{})
    if(!previous) return [];
    _.each(formatted,function(item) {
      if(previous[item.id]) item.previous = previous[item.id];
    })
    return formatted;
  }
}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
