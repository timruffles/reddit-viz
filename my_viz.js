function main() {
  d3.jsonp("http://reddit.com/r/javascript.json?jsonp=d3.jsonp.foo",_.compose(visualize,formatData));
}

function visualize(redditActivitySources) {
  d3.select("body")
    .selectAll("p")
    .data(redditActivitySources)
    .enter()
      .append("p")
      .text(function(d) { return d });
}

function formatData(rawData) {
  return _.pluck(_.pluck(rawData.data.children,"data"),"title")
}

main();
