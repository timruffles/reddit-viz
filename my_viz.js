function main() {
  d3.jsonp("http://reddit.com/r/javascript.json?jsonp=d3.jsonp.foo",
      _.compose(visualize,formatSingleSubreddit));
}

function visualize(redditActivitySources) {
  var sources = d3.select("#viz")
    .selectAll(".source")
    .data(redditActivitySources);

  var sourcesEntering = sources
    .enter()
      .append("g")
      .classed("source",true)
      .attr("transform",function(d,i) {
        return "translate(250," + i * 250 + ")"
      });

  sourcesEntering
    .append("circle")
    .attr("r",function(d,i) {
      return d.score * 5;
    });

  // sources is now UPDATE & ENTER
  
  sourcesEntering
    .append("text")
    .attr("dx",0)
    .attr("dy",0)
    .text(function(d) { return d.title });

}

function formatSingleSubreddit(rawData) {
  return _.pluck(rawData.data.children,"data")
}

main();
