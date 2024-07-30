import {bellSound} from "./util.js";

export function _cancellableSleep(ms, markStopped, markStarted, timerController, bell = false) {
    return new Promise((resolve, reject) => {
        const bellTime = ms * 0.94;

        // Make sure to not send negative ms values otherwise it might not call the callback, dunno why
        if (ms < 0) ms = 0;
        const timeout = setTimeout(() => {
            resolve();
            markStopped();
            console.log("Timer finished naturally");
        }, ms);

        let bellTimeout;
        if (bell) {
            bellTimeout = setTimeout(() => { bellSound(); }, bellTime);
        }

        timerController.signal.addEventListener('abort', () => {
            console.error("Timer finished forcefully");
            clearTimeout(timeout);
            if (bell) clearTimeout(bellTimeout);
            reject(new DOMException('Aborted', 'AbortError'));
        });

        // Cancel signals only have effect from this point forward
        try {
            markStarted();
        } catch (err) {
            console.log(err);
        }
    });
}