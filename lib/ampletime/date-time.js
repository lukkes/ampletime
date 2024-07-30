//===================================================================================
// ==== TIME OPS ====
//===================================================================================

//===================================================================================
export function _getCurrentTimeFormatted() {
    return _getISOStringFromDate(_getCurrentTime()); // => '2015-01-26T06:40:36.181'
}

export function _getCurrentTime() {
    // let timezoneOffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    // return new Date(Date.now()) - timezoneOffset);
    const now = new Date();
    return now;
}

export function _getISOStringFromDate(dateObject) {
    let timezoneOffset = dateObject.getTimezoneOffset() * 60000; //offset in milliseconds
    let newDate = new Date(dateObject - timezoneOffset);
    return newDate.toISOString().slice(0, -1);
}

//===================================================================================
export function _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

//===================================================================================
export function _calculateDuration(startTime, endTime) {
    console.debug(`_calculateDuration(${startTime}, ${endTime})`);
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
export function _addDurations(duration1, duration2) {
    console.debug(`_addDurations(${duration1}, ${duration2})`);

    // Convert durations to seconds
    const seconds1 = _durationToSeconds(duration1);
    const seconds2 = _durationToSeconds(duration2);

    // Add durations
    const totalSeconds = seconds1 + seconds2;

    // Convert total seconds back to "HH:MM:SS" format
    return _secondsToDuration(totalSeconds);
}

//===================================================================================
export function _secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds].map(v => v < 10 ? '0' + v : v).join(':');
}

//===================================================================================
export function _getFormattedDate(date) {
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

export function _formatAsTime(date) {
    const options = {hour: '2-digit', minute: '2-digit', hour12: false};
    return date.toLocaleTimeString(undefined, options);
}