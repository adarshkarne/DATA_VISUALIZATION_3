d3.select("#link_strn").property("value", "0.5").dispatch("input")
d3.select("#collide_force").property("value", "30").dispatch("input")
d3.select("#charge_force").property("value", "-2").dispatch("input")
let strength_val = parseFloat(d3.select("#link_strn").property("value"))
let collide_val = parseFloat(d3.select("#collide_force").property("value"))
let charge_val = parseFloat(d3.select("#charge_force").property("value"))
let sel_val = d3.select('input[name="nodeSize"]:checked').node().value;
upgrade()

function submitForm() {
    d3.select("#viz svg").selectAll("*").remove();
    d3.select("#link_strn").on("input", function () {
        const value = parseFloat(this.value);
        if(strength_val>=0 && strength_val<=1) {
            strength_val = isNaN(value) ? 0.5 : value;
        }
        else
        {
            strength_val = 1;
        }
    })

    d3.select("#collide_force").on("input", function () {
        const value = parseFloat(this.value);
        collide_val = isNaN(value) ? 30 : value;
    })

    d3.select("#charge_force").on("input", function () {
        const value = parseFloat(this.value);
        charge_val = isNaN(value) ? -2 : value;
    })
    sel_val = d3.select('input[name="nodeSize"]:checked').node().value;
    upgrade();

}

function upgrade() {
    d3.json("nw_data.json").then(function (data) {
        const nodes = data.nodes;
        const edges = data.links;

        const svg = d3.select("#viz svg");
        const width = parseInt(svg.attr("viewBox").split(" ")[2]);
        const height = parseInt(svg.attr("viewBox").split(" ")[3]);

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);

        svg.call(zoom);

        const main_group = svg.append("g")
            .attr("transform", "translate(${width * 0.1},${height * 0.1}) scale(1.6)");


        const charge_force = d3.forceManyBody()
            .strength(charge_val);

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id(d => d.id).strength(strength_val))
            .force("charge", charge_force)
            .force("collide", d3.forceCollide(collide_val))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const nodeSize = d3.scaleSqrt()
            .domain([0, d3.max(nodes, d => d.citations * 1)])
            .range([4, 20]);

        const link = main_group.selectAll(".link")
            .data(edges)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke", "grey")
            .attr("stroke-width", 1.5);

        const numberOfColors = 50;
        const plasmaColors = Array.from({ length: numberOfColors }, (d, i) => d3.interpolatePlasma(i / (numberOfColors - 1)));
        const colorScale = d3.scaleOrdinal(plasmaColors);


        const node = main_group.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            //.attr("r", d=>nodeSize(d.citations))
            .attr("fill", d => colorScale(d.country))
            .style("pointer-events", "all")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        node.append("text")
            .attr("dx", 8)
            .attr("dy", ".35em")
            .style("font-size", "10px")
            .text(d => {
                return d.authors})
            .attr("text-anchor","middle");
        let scale;
        if (sel_val === "publications") {
            const authorPublicationsMap = new Map();

            nodes.forEach(node => {
                const authors = node.authors.split(';');
                authors.forEach(author => {
                    const trimmedAuthor = author.trim();
                    authorPublicationsMap.set(trimmedAuthor, (authorPublicationsMap.get(trimmedAuthor) || 0) + 1);
                });
            });
            scale = d3.scaleSqrt()
                .domain([0, d3.max(Array.from(authorPublicationsMap.values()))])
                .range([4, 20]);
            node.transition().duration(500)
                .attr("r", d => {
                    const authors = d.authors.split(';');
                    let totalPublications = 0;
                    authors.forEach(author => {
                        const trimmedAuthor = author.trim();
                        totalPublications += authorPublicationsMap.get(trimmedAuthor) || 0;
                    });
                    return scale(totalPublications);
                })
        }
        else if(sel_val==="degree")
        {
            nodes.forEach(node => {
                // Calculate the degree based on the number of edges connected to the node
                node.degree = edges.filter(edge => edge.source === node.id || edge.target === node.id).length;
            });
            const maxDegree = d3.max(nodes, d => d.degree);
            const nodeSizeScale = d3.scaleSqrt()
                .domain([0, maxDegree])  // Use the max degree
                .range([4, 10]);
            node.attr("r", d => nodeSizeScale(d.degree));
        }
        else
        {
            node.attr("r", d=>nodeSize(d.citations))
        }
        function zoomed(event) {
            main_group.attr("transform", event.transform);
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        }

        simulation.on("tick", ticked);
        function updateNodeSize(criteria) {
            let scale;
            if (criteria === "publications") {
                const authorPublicationsMap = new Map();

                nodes.forEach(node => {
                    const authors = node.authors.split(';');
                    authors.forEach(author => {
                        const trimmedAuthor = author.trim();
                        authorPublicationsMap.set(trimmedAuthor, (authorPublicationsMap.get(trimmedAuthor) || 0) + 1);
                    });
                });
                scale = d3.scaleSqrt()
                    .domain([0, d3.max(Array.from(authorPublicationsMap.values()))])
                    .range([4, 20]);
                node.transition().duration(500)
                    .attr("r", d => {
                        const authors = d.authors.split(';');
                        let totalPublications = 0;
                        authors.forEach(author => {
                            const trimmedAuthor = author.trim();
                            totalPublications += authorPublicationsMap.get(trimmedAuthor) || 0;
                        });
                        return scale(totalPublications);
                    })
                    .on("end", () => simulation.alpha(1).restart());
            } else {
                scale = d3.scaleSqrt()
                    .domain([0, d3.max(nodes, d => d[criteria] * 1)])
                    .range([4, 20]);

                node.transition().duration(500)
                    .attr("r", d => scale(d[criteria]))
                    .on("end", () => simulation.alpha(1).restart());
            }
        }

        function showAuthorDetails(author) {
            console.log(author)
            d3.select("#author_name").text('Names: ' + author.authors);
            d3.select("#author_country").text('Country: ' + author.country);
            d3.select("#author_title").text('Title: ' + author.title);
            d3.select("#author_year").text('Year: ' + author.year);
            d3.select("#authorDetails").style("display", "block");
        }

        node.on('click', function (event, d) {
            showAuthorDetails(d);
        });

        console.log("end")
    });
}