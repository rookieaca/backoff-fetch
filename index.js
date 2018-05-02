const backoff = require('backoff');

module.exports = (backoffOption, ...fetchOptions) => {
    return new Promise((resolve, reject) => {
        const theBackoffOption = { ...backoffOption };

        const algorithm = theBackoffOption.algorithm;
        if (theBackoffOption.algorithm)
            delete theBackoffOption.algorithm;

        const onBackoff = theBackoffOption.onBackoff;
        if (theBackoffOption.onBackoff)
            delete theBackoffOption.onBackoff;

        const failAfter = theBackoffOption.failAfter;
        if (theBackoffOption.failAfter)
            delete theBackoffOption.failAfter;

        let error = new Error();

        const b = backoff[algorithm || 'exponential'](theBackoffOption);
        b.failAfter(failAfter);
        b.on('backoff', (number, delay) => {
            if (onBackoff)
                onBackoff(number, delay);
        });

        b.on('ready', async (number, delay) => {
            try {
                const response = await fetch.apply(null, fetchOptions);

                if (response.ok) {
                    b.reset();
                    resolve(response);
                }
                else {
                    error = new Error(response.statusText);
                    error.response = response;
                    b.backoff();
                }
            } catch (e) {
                error = e;
                b.backoff();
            }
        });

        b.on('fail', () => {
            reject(error);
        });

        b.backoff();
    });
};
