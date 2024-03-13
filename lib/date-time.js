//===================================================================================
// ==== TIME OPS ====
//===================================================================================
function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}

//===================================================================================
async function _getCurrentTime() {
    var timezoneOffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - timezoneOffset)).toISOString().slice(0, -1);
    // e.g., "2023-06-25T09:11:12.037"

    return localISOTime;  // => '2015-01-26T06:40:36.181'
}

//===================================================================================
function _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(':').map(Number);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    console.log(totalSeconds);

    return totalSeconds;
}

//===================================================================================
function _calculateDuration(startTime, endTime) {
    console.log(`_calculateDuration(${startTime}, ${endTime})`);
    // Parse start and end times
    let start = new Date(startTime);
    let end = new Date(endTime);

    // Calculate duration in milliseconds
    let durationMillis = end - start;

    // Convert milliseconds to "HH:MM:SS" format
    let hours = Math.floor(durationMillis / 3600000);
    let minutes = Math.floor((durationMillis - hours * 3600000) / 60000);
    let seconds = Math.floor((durationMillis - hours * 3600000 - minutes * 60000) / 1000);

    // Pad hours, minutes and seconds with leading zeros if necessary
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

//===================================================================================
function _addDurations(duration1, duration2) {
    console.log(`_addDurations(${duration1}, ${duration2})`);

    // Convert durations to seconds
    const seconds1 = _durationToSeconds(duration1);
    const seconds2 = _durationToSeconds(duration2);

    // Add durations
    const totalSeconds = seconds1 + seconds2;

    // Convert total seconds back to "HH:MM:SS" format
    const totalDuration = _secondsToDuration(totalSeconds);

    return totalDuration;
}

//===================================================================================
function _secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds].map(v => v < 10 ? '0' + v : v).join(':');
}

//===================================================================================
function _getFormattedDate(date) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[date.getMonth()];

    const day = date.getDate();
    let daySuffix;
    if (day > 3 && day < 21) daySuffix = "th";
    else {
        switch (day % 10) {
            case 1:  daySuffix = "st"; break;
            case 2:  daySuffix = "nd"; break;
            case 3:  daySuffix = "rd"; break;
            default: daySuffix = "th";
        }
    }

    const year = date.getFullYear();
    return `${month} ${day}${daySuffix}, ${year}`;
}