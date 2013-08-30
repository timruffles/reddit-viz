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
  setTimeout(run,n);
}

function visualize(redditActivitySources) {
  var sources = d3.select("#viz")
    .selectAll(".source")
    .data(redditActivitySources,function(data,index) {
      return data.id;
    });

  var scoreRadius = function(data) {
    console.log(data.score,data.previous && data.previous.score);
    return data.score * 0.05;
  };

  sources
    .transition()
    .select("circle")
    .attr("r",scoreRadius)

  sources
    .classed("increase",function(data) {
      return data.previous.score < data.score;
    })

  var sourcesEntering = sources
    .enter()
      .append("g")
      .classed("source",true)
      .attr("transform",function(d,i) {
        return "translate(250," + i * 250 + 250 + ")"
      });

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
  return function(rawData) {
    var formatted = formatSingleSubreddit(rawData);
    formatted = [_.find(formatted,function(d) { return d.id = "1le4me" })];
    if(previous) {
      _.each(formatted,function(item) {
        if(previous[item.id]) item.previous = previous[item.id];
      })
    }
    previous = _.reduce(formatted,function(prev,item) {
      prev[item.id] = item;
      return prev;
    },{})
    return formatted;
  }
}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
