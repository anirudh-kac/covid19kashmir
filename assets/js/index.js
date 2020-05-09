const API_URL = "/.netlify/functions/api"
const LIVE_API_URL = "https://covidkashmir.org/api/live"
const NEWS_API_URL = "https://covidkashmir.org/api/news/"
const BULLETIN_API_URL = "https://covidkashmir.org/api/bulletin/"

let patientData, districtsMap, snap, countback;
let deferredPrompt;
let tableLimit =50, tablePage =1;
const DISTRICTS = ["Baramulla", "Ganderbal", "Bandipora", "Srinagar", "Anantnag", "Budgam", "Doda", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Pulwama", "Poonch", "Rajouri", "Ramban", "Riasi", "Samba", "Shopian", "Udhampur", "Mirpur", "Muzaffarabad"]
const COLORS = {
    "PRIMARY": {
        "TOTAL": "#f14668",
        "ACTIVE": "#3298dc",
        "RECOVERED": "#48c774",
        "DECEASED": "#4a4a4a"
    },
}
const FILTERS = {
    "Date Announced": "",
    "District": "",
    "Status": ""
}


const API_PROMISE = fetch(API_URL+"?fields=patientData,variance,districtMap,dailyMap,samples,IndiaData,WorldData").then((response) => {
    return response.json()
})
const STATS_PROMISE = fetch(LIVE_API_URL).then((response) => {
    return response.json()
})
const NEWS_PROMISE = fetch(NEWS_API_URL).then((response) => {
    return response.json()
})

const slBaseOptions = {
    chart: {
        type: 'line',
        // width: 100,
        height: 35,
        sparkline: {
            enabled: true
        }
    },
    stroke:{
        curve:"stepline",
        lineCap: "round",
        width: 3
    },
    tooltip: {
        fixed: {
            enabled: false
        },
        x: {
            show: false
        },
        y: {
            title: {
                formatter: function (seriesName) {
                    return ''
                }
            }
        },
        marker: {
            show: false
        }
    }
};
$(document).ready(() => {
    loadStats()
    API_PROMISE.then((data) => {
        $("progress").addClass("is-hidden")
        patientData = data["patientData"];
        districtsMap = data["districtMap"];
        dailyMap = data["dailyMap"]
        loadSparklines(data["variance"]);
        loadSamplesData(data["samples"])
        loadExtraData([data["india"],data["world"]]);
        loadData(true);
    })
    NEWS_PROMISE.then((data) => {
        loadNews(data);
    })
    $(".dropdown-trigger").click(function () {
        $(".dropdown").toggleClass("is-active");
    })

    $("#extradata li").click(function(e){
        $("#extradata li").toggleClass("is-active")
        let t = e.target.dataset["trigger"]
        if(t==0){
            $("#indStats").removeClass("is-hidden")
            $("#wStats").addClass("is-hidden")
        }
        else if(t==1){

            $("#indStats").addClass("is-hidden")
            $("#wStats").removeClass("is-hidden")
        }
    })
})


function loadData(first) {

    loadTable();
    loadDistricts();
    loadFilters();
    loadMap();
    loadChart();
}
function loadDistricts(){
    $("#district-table tbody").html("")
    for(let dis of Object.entries(districtsMap)){
        if(dis[0]==="Unknown") continue;
        $("#district-table tbody").append(`
            <tr>
                <td class="has-text-centered">${dis[0]}</td>
                <td class="has-text-centered">${dis[1]["Total"]}</td>
                <td class="has-text-centered">${dis[1]["Active"]}</td>
                <td class="has-text-centered">${dis[1]["Recovered"]}</td>
                <td class="has-text-centered">${dis[1]["Deceased"]}</td>
                <td class="has-text-centered">${Math.round(1000000/(dis[1]["Population"]/dis[1]["Total"]))}</td>
            </tr>
        `)
    }
}
function loadTable() {
    progressBarVisible(false);
    $("#data-table tbody").html("")
    let filteredData = patientData.filter(item=>matchesFilters(item))
    if(filteredData.length > tableLimit){
        $(".pagination-next").removeClass("is-invisible")
    }
    else {
        $(".pagination-next").addClass("is-invisible")

    }
    for (let i =(filteredData.length - 1) - tableLimit*(tablePage-1); i > (filteredData.length - 1) - (tableLimit*tablePage); i--) {
        if(i<0) break;
        patient = filteredData[i]
        // if (!matchesFilters(patient)){
        //     filterOffset++;
        //     i--;
        //     continue;
        // } 
        $("#data-table tbody").append(`
        <tr ${(patient["Status"]=="Recovered") ? `style="background-color: #ebfffc"`:""} 
        ${(patient["Status"]=="Deceased") ? `style="background-color: #feecf0"`:""}
        onclick=javascript:patientModal(${patientData.indexOf(patient)})
        >
        <td>${patientData.indexOf(patient)+1}</td>
                      <td data-value=${patientData.indexOf(patient)+1}>${patient["Date Announced"]}</td>
                      <td>${patient["District"]}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${patient["Locality"]}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${patient["Age"]}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${patient["Gender"]}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${patient["History"]}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${patient["Notes"]}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${formatSources(patient)}</td>
                      <td class="is-hidden-mobile is-hidden-tablet-only">${patient["Status"]}</td>
                      <td><a class="button is-small - is-rounded is-info" onclick="javascript:patientModal(${patientData.indexOf(patient)}>${patient["Status"]}">View Details</a></td>
                      
        </tr>
    `)
    }
    // $("#data-table th")[1].click()
}

function changePage(c){
    
    $(".pagination-previous").removeClass("is-invisible")
    $(".pagination-next").removeClass("is-invisible")

    tablePage += c;
    if(tablePage === 1){
        $(".pagination-previous").addClass("is-invisible")
    }
    if(tablePage*tableLimit>patientData.length){
        $(".pagination-next").addClass("is-invisible")

    }
    loadTable();
    $("#data-table")[0].scrollIntoView()
}
function formatSources(patient) {
    let links = patient["Sources"].split(",")
    let sources = []
    for (link of links) {
        if(!link.startsWith("http")){
            sources.push(`<a href=https://"${link}">${links.indexOf(link)+1}</a>`)
            continue;
        }
        sources.push(`<a href="${link}">${links.indexOf(link)+1}</a>`)
    }
    return sources.join(" ")
}

function loadStats() {
    $("#cases_total").html("");
    $("#cases_active").html("");
    $("#cases_deaths").html("");
    $("#cases_recovered").html("");
    $("#cases_total").addClass("loadanim")
    $("#cases_active").addClass("loadanim")
    $("#cases_deaths").addClass("loadanim")
    $("#cases_recovered").addClass("loadanim")
    $("#cases_total_today").html("");
    $("#cases_active_today").html("");
    $("#cases_deaths_today").html("");
    $("#cases_recovered_today").html("");
    $("#patientstats_updated").html("")
    fetch(LIVE_API_URL).then((response) => {
        return response.json()
    }).then(data=>{
    $("#cases_total").removeClass("loadanim")
    $("#cases_active").removeClass("loadanim")
    $("#cases_deaths").removeClass("loadanim")
    $("#cases_recovered").removeClass("loadanim")
    $("#cases_total").html(data.Total);
    $("#cases_active").html(data.Active);
    $("#cases_deaths").html(data.Deceased);
    $("#cases_recovered").html(data.Recovered);
    $("#cases_total_today").html(data.Total - data.TotalYesterday);
    $("#cases_active_today").html((data.Active - data.ActiveYesterday) + (data.Deceased - data.DeceasedYesterday) + (data.Recovered - data.RecoveredYesterday));
    $("#cases_deaths_today").html(data.Deceased - data.DeceasedYesterday);
    $("#cases_recovered_today").html(data.Recovered - data.RecoveredYesterday);
    $("#patientstats_updated").html(data.Updated)
})
    
    


}

function loadNews(data) {
    let $container = $("#twitterfeed-container")
    for(let item of data){
        let div = $("<div></div>")[0]
        twttr.widgets.createTweet(item["url"].split("/").slice(-1)[0], div, {
            width: $container.width()
        })
        $container.append(div)
    }
    let speed = 1;
    let hoverFlag = false;
    $container.hover(()=>{
        hoverFlag =true;
    },()=>{
        hoverFlag = false;
    })
    setInterval(()=>{

        if(!hoverFlag){
            $container[0].scrollTop += speed;
            if($container[0].scrollTop === $container[0].scrollHeight - $container[0].offsetHeight){
                $container[0].scrollTop =0
            }
            // $container[0].scroll(0,$container[0].scrollTop)
        }
    },30)
}

function loadMap() {
    
    snap = Snap("#map")
    Snap.load("assets/media/jk_districts_1.svg", (data) => {
        snap.append(data)
        let districtShapes = snap.selectAll("path")
        districtShapes.forEach((districtShape) => {
            districtShape.attr("fill", getFillColor(districtShape.node.id.toTitleCase()))
            districtShape.click((event) => {
                selectMapDistrict(districtShape)
            })
        })
        makeLegend()
        selectMapDistrict(snap.select("#srinagar"))
    })
    // legend.rect(0,0,500,500)
}

function loadSparklines(data) {
    const config = {
        "total" : {
            "color":"#FF073A",
            "data":data["total"],
            "element":"#slTotal"
        },
        "active":{
            "color":"#007bff",
            "data":data["active"],
            "element":"#slActive"
        },
        "recovered":{
            "color":"#28a745",
            "data":data["recovered"],
            "element":"#slRecovered"
        },
        "deceased":{
            "color":"#6c757d",
            "data":data["deceased"],
            "element":"#slDeceased"
        },
    }
    
    for(let value of Object.values(config)){
        let options = slBaseOptions;
        options["series"] = [
            {
                data: value["data"]
            }
        ]
        options["colors"]=[value["color"]]
        new ApexCharts($(value["element"])[0],options).render();
    }

}

function loadSamplesData(data){
    $("#stats_samples").removeClass("loadanim")
    
    $("#stats_posper").removeClass("loadanim")
    $("#stats_negper").removeClass("loadanim")
    $("#stats_date").html(data["date"])
    $("#stats_samples").html(data["stats"]["total"])
    $("#stats_samples_today").html(data["stats"]["new"])
    $("#stats_posper").html(data["stats"]["posper"].toFixed(2))
    $("#stats_negper").html(data["stats"]["negper"].toFixed(2))
    const config = {
        "total" : {
            "color":"#250339",
            "data":data["variance"]["total"],
            "element":"#slSamples"
        },
        "posper":{
            "color":"#FF073A",
            "data":data["variance"]["posper"],
            "element":"#slPositivePercentage"
        },
        "negper":{
            "color":"#28a745",
            "data":data["variance"]["negper"],
            "element":"#slNegativePercentage"
        },
    }
    for(let value of Object.values(config)){
        let options = slBaseOptions;
        options["series"] = [
            {
                data: value["data"]
            }
        ]
        options["colors"]=[value["color"]]
        new ApexCharts($(value["element"])[0],options).render();
    }

}
function loadChart() {
    
    chartOptions = {
        series: [{
            name: 'Case',
            data: Object.values(dailyMap)
        }],
        chart: {
            height: 350,
            type: 'line',
        },
        stroke: {
            width: 7,
            curve: 'smooth'
        },
        xaxis: {
            categories: Object.keys(dailyMap).map(item=>item.replace("/2020",""))
        },
        title: {
            text: "Cases Announced Daily"
        },
        subtitle: {
            text: "Source: covidkashmir.org"
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                gradientToColors: ['#FDD835'],
                shadeIntensity: 1,
                type: 'horizontal',
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100, 100, 100]
            },
        },
        markers: {
            size: 4,
            colors: ["#FFA41B"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: {
                size: 7,
            }
        },
        yaxis: {
            min: 0,
            max: 60,
            title: {
                text: 'No. of cases',
            },
        }
    };
    let chart = new ApexCharts(document.querySelector("#chart1"), chartOptions);
    chart.render();
}

function loadExtraData(arr){
    $("#indActive").html(arr[0]["active"])
    $("#indRecovered").html(arr[0]["recovered"])
    $("#indDead").html(arr[0]["deaths"])
    $("#indTotal").html(arr[0]["total"])
    $("#wTotal").html(arr[1]["total"])
    $("#wDead").html(arr[1]["deaths"])
    $("#wRecovered").html(arr[1]["recovered"])
}

function selectMapDistrict(dShape) {
    snap.selectAll("path").forEach((item) => {
        item.attr("stroke", "#000000");
        item.attr("strokeWidth", "1");
    })
    dShape.paper.node.removeChild(dShape.node)
    dShape.paper.node.insertBefore(dShape.node, dShape.paper.node.firstChild)
    dShape.attr("stroke", COLORS.PRIMARY.RECOVERED)
    dShape.attr("strokeWidth", "3px")
    activateDistrict(dShape.node.id.toTitleCase())
}

function patientModal(id) {
    let patient = patientData[id];
    $("#modal-details-id").html(id + 1);
    $("#modal-details-age").html(patient["Age"])
    $("#modal-details-gender").html(patient["Gender"])
    $("#modal-details-history").html(patient["History"])

    $("#modal-details-city").html(patient["City"])
    $("#modal-details-district").html(patient["District"])
    $("#modal-details-locality").html(patient["Locality"])
    $("#modal-details-date-announced").html(patient["Date Announced"])
    $("#modal-details-date-change").html(patient["Date Status Change"])
    $("#modal-details-notes").html(patient["Notes"])
    $("#modal-details-sources").html(patient["Sources"].split(",").map((link) => {
        return `<p class="subtitle"><a href="${link}" target="_blank">${link}</a></p>`
    }))


    $("#modal-details-current-status").html(`<span class="tag 
        ${(patient["Status"]==="Recovered") ? `is-primary`:""}
        ${(patient["Status"]==="Deceased")?`is-danger`:""}
        ${(patient["Status"]==="Hospitalized")?`is-info`:""}">
    ${patient["Status"]}</span>`)
    toggleModal("modal-patient")
}



function shareStatsImage() {
    $(".dropdown").toggleClass("is-active");
    $(".dropdown").toggle()
    html2canvas(document.querySelector("#stats")).then((canvas) => {
        $(".dropdown").toggle()
        $("#modal-stats-image .modal-card-body").html(canvas);
        let imData = canvas.toDataURL("image/png").replace(
            /^data:image\/png/, "data:application/octet-stream")
        $("#modal-stats-image footer a.is-success").attr("href", imData);
        toggleModal("modal-stats-image")
    })
}

function shareStatsText() {
    $(".dropdown").toggleClass("is-active");
    toggleModal("modal-stats-text")

    let stats = getStatsText(patientData)
    let districts = patientData.map((item) => {
        return item["District"]
    }).filter((value, index, self) => {
        return self.indexOf(value) === index
    });
    for (let district of districts) {
        districtData = patientData.filter((item) => {
            return item["District"] === district
        });
        stats += `\n\n${district}: \n${getStatsText(districtData)}`
    }
    stats += "\nSource: covidkashmir.org"
    $("#stats-textarea").text(stats)
}

function getStatsText(data) {
    let total = data.length;
    let active = data.filter((item) => {
        return item["Status"] === "Hospitalized"
    }).length;
    let deaths = data.filter((item) => {
        return item["Status"] === "Deceased"
    }).length;
    let recovered = data.filter((item) => {
        return item["Status"] === "Recovered"
    }).length
    return `Total: ${total}${(active)?`\nActive:${active}`:""}${(deaths)?`\nDeaths:${deaths}`:""}${(recovered)?`\nRecovered:${recovered}`:""}`
}

function copyStatsText() {
    $("#stats-textarea").select();
    document.execCommand('copy')
    $("#modal-stats-text footer a.is-success").html("Copied");

}

function activateDistrict(district) {
    $("#map-district_name").html(district);
    $("#map-cases_total").html("0")
    $("#map-cases_active").html("0")
    $("#map-cases_recovered").html("0")
    $("#map-cases_deceased").html("0")
    if(Object.keys(districtsMap).includes(district)){
        for (let c of Object.keys(districtsMap[district])) {
            $("#map-cases_" + c.toLowerCase()).html(districtsMap[district][c])
        }
    }
}
$(window).resize(function () {
    if ($("#legend").children().length) {
        $("#legend").html("");
        makeLegend();
    }
})

function makeLegend() {
    legend = Snap("#legend")
    let activeDistrictsMap = {}
    for(let k of Object.keys(districtsMap)){
        activeDistrictsMap[k] = districtsMap[k]["Active"]
    }
    let svgWidth = snap.node.offsetWidth;
    let min = Math.min(...Object.values(activeDistrictsMap))
    let max = Math.max(...Object.values(activeDistrictsMap))
    let range = (max - min) / 3
    let stops = [svgWidth / 3, 4 * svgWidth / 9, 5 * svgWidth / 9, 2 * svgWidth / 3]
    // let stops = [0, svgWidth/3, 2*svgWidth/3, svgWidth]
    let barWidth = svgWidth / 9;
    let barHeight = 10;
    legend.rect(stops[0], 0, barWidth, barHeight).attr("fill", "#fee8c8")
    legend.rect(stops[1], 0, barWidth, barHeight).attr("fill", "#fdbb84")
    legend.rect(stops[2], 0, barWidth, barHeight).attr("fill", "#e34a33")
    legend.text(stops[0] - 5, 2.5 * barHeight, "1").attr("fill", "#000")
    legend.text(stops[1] - 5, 2.5 * barHeight, `${Math.floor(min + range)}`).attr("fill", "#000")
    legend.text(stops[2] - 5, 2.5 * barHeight, `${Math.floor(min + (range * 2))}`).attr("fill", "#000")
    legend.text(stops[3] - 5, 2.5 * barHeight, max).attr("fill", "#000")

}

function getFillColor(district) {
    let activeDistrictsMap = {}
    for(let k of Object.keys(districtsMap)){
        activeDistrictsMap[k] = districtsMap[k]["Active"]
    }
    if (!Object.keys(activeDistrictsMap).includes(district) || districtsMap[district]["Active"]==='0') return "#ffffff"
    let min = Math.min(...Object.values(activeDistrictsMap))
    let max = Math.max(...Object.values(activeDistrictsMap))
    let range = (max - min) / 3
    let number = activeDistrictsMap[district];
    if (number < min + range) return "#fee8c8"
    else if (number < min + (range * 2)) return "#fdbb84"
    else if (number <= max) return "#e34a33"
}

function loadFilters() {
    let districts = getUniqueData("District")
    let dates = getUniqueData("Date Announced")
    let statuses = getUniqueData("Status")
    for (let district of districts) $("#filter-district").append(`<option>${district}</option>`)
    for (let date of dates) $("#filter-date-announced").append(`<option>${date}</option>`)
    for (let status of statuses) $("#filter-status").append(`<option>${status}</option>`)
    $("#data-filters .select").removeClass("is-loading")
    $("#filter-district").change(() => {
        if ($("#filter-district")[0].selectedIndex !== 0) FILTERS["District"] = $("#filter-district").val()
        else FILTERS["District"] = ""
        loadTable()
    })
    $("#filter-date-announced").change(() => {
        if ($("#filter-date-announced")[0].selectedIndex !== 0) FILTERS["Date Announced"] = $("#filter-date-announced").val()
        else FILTERS["Date Announced"] = ""
        loadTable()
    })
    $("#filter-status").change(() => {
        if ($("#filter-status")[0].selectedIndex !== 0) FILTERS["Status"] = $("#filter-status").val()
        else FILTERS["Status"] = ""
        loadTable()
    })
}

function getUniqueData(key) {
    return patientData.map((item) => {
        return item[key]
    }).filter((value, index, self) => {
        return self.indexOf(value) === index
    });
}

function matchesFilters(patient) {
    for (let key of Object.keys(FILTERS)) {
        if (FILTERS[key] === "") continue;
        if (patient[key] !== FILTERS[key]) return false;
    }
    return true;
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#buttonDownload").removeClass("is-hidden")
});
function downloadApplication(){
    $("#buttonDownload").addClass("is-hidden")
    deferredPrompt.prompt();
}
