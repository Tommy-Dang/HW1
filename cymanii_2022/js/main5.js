var units = "MBTU/D";

// set the dimensions and margins of the graph
var margin = {top: 10, right: 10, bottom: 50, left: 10},
    width = 1000 - margin.left - margin.right,
    height = 340 - margin.top - margin.bottom;

// format variables
var formatNumber = d3.format(",.0f"),    // zero decimal places
    format = function(d) { return formatNumber(d) + " " + units; },
    color = d3.scaleOrdinal(d3.schemeCategory10);

let optimum = {baffle_spacing:6,tube_pattern:'90-Square'}


let linkColors = d3.scaleOrdinal()
    .domain(["fuel", "steam",  "electricity", "thermal", "loss"])
    .range(['#8047ab', '#809641','#03adf7','#D81B60','#000']);

// let nodeColors = {"Onsite Steam Generation" : '#1976D2',
//     "Electricity": '#03adf7',
//     "Fuel" : '#8047ab',
//     "Steam" : '#809641',
//     " Steam" : '#809641',
//     "Loss Energy" : '#000'
//
// }

let types = ["fuel", "steam", "electricity", "thermal", "loss"]

let data_

let perc_toggle = false;

async function load_data(){
    d3.csv("./data/sankey_data.csv", function(error, data) {
        adjust_fuel(calculate_values())
        recalc();
        data_ = update_data(data)
        draw_sankey(data)
        return (data)
    })
}

let controlDict = {};
let controlgroup = ['002']//['002','003','003A','004','004A'];
controlgroup.forEach(d=>{
    optimum['baffle_spacing'+'_'+d] = 2;
    optimum['tube_pattern'+'_'+d] = '90-Square';
    controlDict[d] = ()=>0;
});
function load_control(){
    return new Promise((resolve)=>resolve(controlgroup.map(d=>d3.csv(`./data/heat-exchanger_data/06E-${d}.csv`, function(error, data) {

        const baffle_spacing_values = d3.nest().key(d=>d['baffle_spacing']).entries(data);
        const baffle_spacing_options = baffle_spacing_values.sort((a,b)=>a.key.localeCompare(b.key));
        optimum['baffle_spacing'+'_'+d] = baffle_spacing_options[0].key;
        create_slider_array('baffle_spacing'+'_'+d, {title:`[${d}] baffle_spacing`,options:baffle_spacing_options.map(d=>d.key),value:optimum['baffle_spacing'+'_'+d]}, 'temperatures');

        const tube_pattern_values = d3.nest().key(d=>d['tube_pattern']).entries(data);
        const tube_pattern_options = tube_pattern_values.sort((a,b)=>a.key.localeCompare(b.key));
        optimum['tube_pattern'+'_'+d] = tube_pattern_options[0].key;
        create_slider_array('tube_pattern'+'_'+d,{title:`[${d}] tube_pattern`,options:tube_pattern_options.map(d=>d.key),value:optimum['tube_pattern'+'_'+d]}, 'temperatures');

        const dict = d3.nest().key(d=>d['baffle_spacing']).key(d=>d['tube_pattern']).object(data);

        controlDict[d] = ({baffle_spacing,tube_pattern})=>{
            if (dict[baffle_spacing]&&dict[baffle_spacing][tube_pattern]){
                let values = dict[baffle_spacing][tube_pattern][0];
                return {delta_temperature:+values['delta_temperature'],result:((+values['delta_temperature'])-21.309604301425622) /0.0316688}
            }
            return {delta_temperature:undefined,result:undefined};
        };
        return (data)
    }))))
}

load_control().then(load_data)




function draw_sankey(data){

    var header = d3.select("div#sankey").append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", 20 + margin.top + margin.bottom)
        //.append("rect")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")")
        .attr("fill", "black");

    d3.select('div#sankey svg').remove();

// append the svg object to the body of the page
    var svg = d3.select("div#sankey").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

// Set the sankey diagram properties
    var sankey = d3.sankey()
        // .nodeWidth(46)
        .nodeWidth(12)
        .nodePadding(40)
        .size([width, height]);

    var path = sankey.link();



        //set up graph in same style as original example but empty
        graph = {"nodes" : [], "links" : []};

        data.forEach(function (d) {
            graph.nodes.push({ "name": d.source });
            graph.nodes.push({ "name": d.target });
            graph.links.push({ "source": d.source,
                "target": d.target,
                "value": +d.value,
                "type": d.type});

        });

        // return only the distinct / unique nodes
        graph.nodes = d3.keys(d3.nest()
            .key(function (d) { return d.name; })
            .object(graph.nodes));

        // loop through each link replacing the text with its index from node
        graph.links.forEach(function (d, i) {
            graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
            graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
        });

        // now loop through each nodes to make nodes an array of objects
        // rather than an array of strings
        graph.nodes.forEach(function (d, i) {
            graph.nodes[i] = { "name": d };
        });

        sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .layout(32);

        // add in the links
        var link = svg.append("g").selectAll(".link")
            .data(graph.links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", path)
            // .attr("title", (d)=>`${d.source.Name}->${d.target.name}<br> ${Math.round(d.value*10)/10} ${units}`)
            .style("stroke-width", function(d) { return Math.max(1, d.dy); })
            .style("stroke", function (d){ return linkColors(d.type)} )
            //.style("stroke", function (d){ return '#000'} )
            .style("fill", "none")
            .style("stroke-opacity", .2)
            .on("mouseover",function(d) {
                d3.select(this).style("stroke-opacity", .5);
                d3.select('div.tooltip').transition()
                    .duration(200)
                    .style("opacity", .9);
                d3.select('div.tooltip').html(`${d.source.name} → ${d.target.name}<br> ${Math.round(d.value*10)/10} ${units}`)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

            })
            .on("mousemove",function(d) {
                d3.select('div.tooltip')
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

            })
            .on("mouseleave",function() {
                d3.select(this).style("stroke-opacity", .2);
                d3.select('div.tooltip').transition()
                    .duration(500)
                    .style("opacity", 0);
            })

            .sort(function(a, b) { return b.dy - a.dy; });

        // add the link titles
        // link.append("title")
        //     .text(function(d) {
        //         return d.source.name + " → " +
        //             d.target.name + "\n" + format(d.value); });

        // add in the nodes
        var node = svg.append("g").selectAll(".node")
            .data(graph.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")"; })
            .call(d3.drag()
                .subject(function(d) {
                    return d;
                })
                .on("start", function() {
                    this.parentNode.appendChild(this);
                })
                .on("drag", dragmove));

        // add the rectangles for the nodes
        node.append("rect")
            .attr("height", function(d) { return d.dy; })
            .attr("width", sankey.nodeWidth())
            // .style("fill", function(d) {
            //     return d.color = color(d.name.replace(/ .*/, "")); })
            .style("fill", function(d) { return '#FFFFFF'})
            //     if (Object.keys(nodeColors).includes(d.name)){
            //         return nodeColors[d.name];
            //     }
            //     else{return d.color = color(d.name.replace(/ .*/, "")); }}
            // )
            // return d.color = color(d.name.replace(/ .*/, "")); })
            // .style("fill", function(d) {
            //     colors.filter(obj => {
            //         return obj.name == d.name ? obj.color : null})})
            //return d.color = colors.name == (d.name.replace(/ .*/, "")); })
            .style("stroke", function(d) {
                return d3.rgb(d.color).darker(2); })
            .append("title")
            .text(function(d) {
                return d.name + "\n" + format(d.value); });

        // add in the title for the nodes
        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })

            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) { return d.name; })
            .filter(function(d) { return d.x < width / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");
//Percentage Text
        // node.append("text")
        //     .attr("x", sankey.nodeWidth()/2)
        //     // .attr("y", function(d) {
        //     //     if(d.dy < 16){
        //     //         return d.dy * 2;
        //     //     }
        //     //     else return d.dy / 2;
        //     // })
        //     .attr("y", function(d) { return d.dy / 2; })
        //     //.attr("dy", ".35em")
        //     .attr("dy", function(d) {
        //         if(d.dy < 16){
        //             return  "-.175em";
        //         }
        //         else return ".35em";
        //     })
        //     .text(function(d) { return parseFloat(d.value/6.5).toFixed(2)*100 + "%"; })
        //     .attr("text-anchor", "middle");
        //
        var legend = svg.append("g").selectAll(".legend")
            .data(types)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d) {
                return "translate(" + types.indexOf(d)*150  + "," + (height+20) + ")"; })

        legend.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", function(d) {return linkColors(d)})
            .style("opacity", .3)

        legend.append("text")
            .text(function (d){return d.charAt(0).toUpperCase() + d.slice(1);})
            .attr("x", 20)
            .attr("y", 10)
            .attr("dy", ".35em")
            .attr("dx", ".35em")
            .attr("text-anchor", "start")
            .style("fill", "black")



        // the function for moving the nodes
        function dragmove(d) {
            d3.select(this)
                .attr("transform",
                    "translate("
                    + d.x + ","
                    + (d.y = Math.max(
                            0, Math.min(height - d.dy, d3.event.y))
                    ) + ")");
            sankey.relayout();
            link.attr("d", path);
        }
}


function delta_display(){
    let delta = d3.select('div#optimization_result')
        .append('p')
        .attr('class', "_result")
        .append('span')
        .attr('id', 'formula');
    let resutl = d3.select('._result')
        //.text('Delta Temperature Result: ')
        .append("span")
        .attr('id', 'deltaTemp')

    let html = MathJax.tex2chtml(`fuel\\_gas = \\frac{\\Delta T_m - 21.309604301425622}{0.0316688} `);
    // let html2 = MathJax.tex2chtml(`Total\\_fuel\\_gas = ${controlgroup.map(d=>`fuel_{${d}}`).join('+')}`);
    let html2 = MathJax.tex2chtml(`\\Sigma\\Delta T_m = ${controlgroup.map(d=>`\\Delta T_{m ${d}}`).join('+')}`);
    let text = html.outerHTML;
    // //d3.select('#deltaTemp').text(html);
    document.getElementById("formula").innerHTML = html2.outerHTML+text;

}
let values = {}
values["baffle_spacing"] = optimum['baffle_spacing'].toString()
values["tube_pattern"] = optimum['tube_pattern'].toString()

values['Percentage'] = 0
function create_slider(num, _min, _max, _default, _class){

    let sliderContainer = d3
        .select('#sliders')
        .append('div')
        .attr('id', 'slider'+num)
        .attr('class', '_slider')


    let sliderValue = d3.select('#slider'+num)
        .append('p')
        .attr('id', "heading"+num)
        .attr('class', _class)
        .append('span')
        .text(function(){
            if (num === 'Percentage'){
                return 'Heat Exchanger '+num+' Increase : '
            }
            else{ return num+ ': ' }
        })
        //.text(num+': ')
        .append('span')
        .attr("id","value"+num)
        .text(function(){
            if (num === 'Percentage'){
                return _default+' %'
            }
            else{ return _default }
        });

    let sliderSimple = d3v6
        .sliderBottom()
        .min(_min)
        .max(_max)
        .width(300)
        //.tickFormat(d3v6.format('.2%'))
        .ticks(5)
        .default(_default)
        .on('onchange', val => {
            //filter_intersection(val)
            num == 'Percentage' ? d3.select('#value'+num).text(d3v6.format('.3')(val)+' %'): d3.select('#value'+num).text(d3v6.format('.3')(val));

            values[num] = d3v6.format('.3')(val)
            perc_toggle ? adjust_perc(val) : adjust(calculate_values())
            //adjust(calculate_values())
        });

    let gSimple = d3v6
        .select('#slider'+num)
        .append('svg')
        .attr("id", "slider"+num+'svg')
        .attr('class', _class)
        .attr('width', 400)
        .attr('height', 75)
        .append('g')
        .attr('transform', 'translate(30,30)');

    gSimple.call(sliderSimple);
}

function create_slider_array(num, {options,title, value:_default}, _class){

    // check before ass new slider
    if (!d3.select('#sliders').select('#slider'+num).empty()){
        d3.select('#sliders').select('#slider'+num).remove();
    }


    let sliderContainer = d3
        .select('#sliders')
        .append('div')
        .attr('id', 'slider'+num)
        .attr('class', '_slider')


    let sliderLabel = d3.select('#slider'+num)
        .append('p')
        .attr('id', "heading"+num)
        .attr('class', _class)
        .append('span')
        .text(function(){
            if (num === 'Percentage'){
                return 'Heat Exchanger '+num+' Increase : '
            }
            else{ return (title??num)+ ' = ' }
        });
        //.text(num+': ')
    sliderLabel.append('span')
        .attr("id","value"+num)
        .text(function(){
            return _default
        });


    let optionsReverse = {};
    options.forEach((d,i)=>{
        optionsReverse[d] = i;
    });

    let sliderSimple = d3v6
        .sliderBottom()
        .min(0)
        .max(options.length-1)
        .step(1)
        .width(300)
        .tickFormat((d)=>options[d])
        .ticks(5)
        .default(optionsReverse[_default])
        .on('onchange', val => {
            //filter_intersection(val)
            d3.select('#value'+num).text(options[val]);

            values[num] = options[val]
            adjust(calculate_values())
            //adjust(calculate_values())
        });

    let gSimple = d3v6
        .select('#slider'+num)
        .append('svg')
        .attr("id", "slider"+num+'svg')
        .attr('class', _class)
        .attr('width', 400)
        .attr('height', 50);

    gSimple
        .append('g')
        .attr('transform', 'translate(30,15)')
        .call(sliderSimple);
    // gSimple.style('height',0)
    // sliderLabel.append('button')
    //     .text('Edit')
    //     .datum({value:false})
    //     .on('click',function(d){
    //         d.value = !d.value;
    //         if (d.value){
    //             d3.select(this).text('Hide');
    //             gSimple.style('height','50px')
    //         }else{
    //             d3.select(this).text('Edit');
    //             gSimple.style('height',0)
    //         }
    //     });
}


function calculate_values(){

    let result = controlgroup.map(d=>{
        const baffle_spacing = d3.select('#valuebaffle_spacing_'+d).text();
        const tube_pattern = d3.select('#valuetube_pattern_'+d).text();
        let {delta_temperature,result} = controlDict[d]({baffle_spacing,tube_pattern})
        return delta_temperature;
    });
    let totaldelta = d3.sum(result);
    let total = (totaldelta-21.309604301425622) /0.0316688
    let resultdelta_ = d3v6.format('s')(totaldelta)
    let result_ = d3v6.format('s')(total)

    let formula_string = [`${resultdelta_} =${result.map(d=>d3v6.format('s')(d)).join('+')}`,
    `${result_} = \\frac{${resultdelta_} - 21.309604301425622}{0.0316688}`];
    update_formula(formula_string)

    MathJax.typeset(() => {
        const math = document.querySelector('#deltaTemp');
        math.innerHTML = '';
        return math;
    });

    return total
}
let dict_perc = {}
let total_dict = {}
let total_dict_2 = {}
init_info()
recalc()
// draw_sankey();

function update_formula(string){
    let text = '';
    if (typeof string ==='String') {
        let html = MathJax.tex2chtml(string);
        text = html.outerHTML;
    }else{
        text = string.map(s=>MathJax.tex2chtml(s).outerHTML).join('');
    }
    document.getElementById("deltaTemp").innerHTML = text;
}


controlgroup.forEach(d=>{
    create_slider_array('baffle_spacing'+'_'+d, {title:`[${d}] baffle_spacing`,options:[2,3,4,5,6],value:optimum['baffle_spacing'+'_'+d]}, 'temperatures')
    create_slider_array('tube_pattern'+'_'+d,{title:`[${d}] tube_pattern`,options:['90-Square','30-Triangular','60-Rotated Tri.','45-Rotated Sqr.'],value:optimum['tube_pattern'+'_'+d]}, 'temperatures')
});


delta_display()
calculate_values()
function init_info(){
    dict_perc['Electricity'] = {}
    dict_perc['Electricity']['Process Heating'] = .3
    dict_perc['Electricity']['Machine Drive'] = .4
    dict_perc['Electricity']['Non-process energy'] = .15
    dict_perc['Electricity']['Non-FCC process'] = .15
    dict_perc['Onsite Steam Generation'] = {}
    dict_perc['Onsite Steam Generation']['Thermal-Chemical'] = .8
    dict_perc['Onsite Steam Generation']['Non-FCC process'] = .2
    dict_perc['Fuel'] = {}
    dict_perc['Fuel']['Process Heating'] = 1
    dict_perc['Thermal-Chemical'] = {}
    dict_perc['Thermal-Chemical']['Applied Energy'] = 0.63
    dict_perc['Thermal-Chemical']['Steam'] = 0.30
    dict_perc['Thermal-Chemical']['Loss Energy'] = 0.07
    dict_perc['Process Heating'] = {}
    dict_perc['Process Heating']['Thermal-Chemical'] = 0.8
    dict_perc['Process Heating']['Loss Energy'] = 0.2
    dict_perc['Machine Drive'] = {}
    dict_perc['Machine Drive']['Loss Energy'] = .25
    dict_perc['Machine Drive']['Applied Energy'] = .75
    dict_perc['Non-FCC process'] = {}
    dict_perc['Non-FCC process']['Loss Energy'] = 1
    dict_perc['Non-process energy'] = {}
    dict_perc['Non-process energy']['Loss Energy'] = 1
    total_dict['Electricity'] = 0.06947
    total_dict['Fuel'] = 0.769265
    total_dict['Onsite Steam Generation'] = 0.15653
}

function recalc(){
    Object.keys(dict_perc).forEach(d => total_dict_2[d] = 0)
    Object.keys(total_dict).forEach(d => total_dict_2[d] = total_dict[d])

    Object.keys(dict_perc).forEach(d => {
        Object.keys(dict_perc[d]).forEach(e => {
            if (Object.keys(total_dict_2).includes(e) && Object.keys(total_dict).includes(d)){
                total_dict_2[e] += total_dict[d]*dict_perc[d][e]
            }})
    })
    total_dict_2['Process Heating'] = total_dict['Fuel']*dict_perc['Fuel']['Process Heating'] + total_dict['Electricity']*dict_perc['Electricity']['Process Heating']
    total_dict_2['Thermal-Chemical'] = (total_dict['Onsite Steam Generation']*dict_perc['Onsite Steam Generation']['Thermal-Chemical']) + (total_dict_2['Process Heating']*dict_perc['Process Heating']['Thermal-Chemical'])
}

function update_data(data){
    let scalar = 1405.5568947058375
    data.forEach(d => d.value = total_dict_2[d.source] * dict_perc[d.source][d.target] * scalar)
    return data
}
function adjust_fuel(result){
    total_dict['Fuel'] = result*920.67/1000000  //(result/972.8)
}
function adjust(result){
    adjust_fuel(result);
    if (result !== undefined){
        recalc();
        update_data(data_)
        draw_sankey(update_data(data_))
    }
}

// function adjust_perc(perc){
//
//     if (perc > 0 && perc < 100){
//         total_dict['Fuel'] = .774 * (1-(perc/100))
//         recalc();
//         update_data(data_)
//         draw_sankey(update_data(data_))
//     }
// }

function adjust_perc(perc){

    if (perc > 0 && perc < 100){

        // 0.769265 = 32211.68scf

        delta_temp_increase = 314.81 * (perc/100)
        //console.log(delta_temp_increase)

        scf_saved = (delta_temp_increase-21.309604301425622) / 0.00316688


        //console.log(delta_temp_increase-21.309604301425622)

        //console.log(scf_saved)

        //scf_saved / 32211.68
        if (scf_saved > 0 && scf_saved < 32211.68) {
            //total_dict['Fuel'] = .774 * (1-(perc/100))
            total_dict['Fuel'] = (32211.68 - scf_saved) / 32211.68
        }
        recalc();
        update_data(data_)
        draw_sankey(update_data(data_))
    }
}



create_slider('Percentage', 0, 100, 0, 'percentage')
d3.selectAll('.percentage').style('display', 'none')


function toggle_percentage(){
    if (perc_toggle===false){
        document.getElementById('percentage_button').textContent = 'Temperatures'
        document.getElementById("formula").style.display = 'none'
        document.getElementById("deltaTemp").style.display = 'none'
        d3.selectAll('.temperatures').style('display', 'none')
        d3.selectAll('.percentage').style('display', null)
        perc_toggle = true
    }
    else{
        document.getElementById("formula").style.display = null
        document.getElementById("deltaTemp").style.display = null
        document.getElementById('percentage_button').textContent = 'Percentage'
        d3.selectAll('.temperatures').style('display', null)
        d3.selectAll('.percentage').style('display', 'none')
        perc_toggle = false
    }
}






