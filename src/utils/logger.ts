/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class Logger {
    private static shouldOutputLog = process.env.OUTPUT_LOGGER === undefined ? true : (process.env.OUTPUT_LOGGER === 'true');

    public static debug(message?: any, ...optionalParams: any[]): void {
        if (this.shouldOutputLog) {
            console.log(message, ...optionalParams);
        }
    }

    public static info(message?: any, ...optionalParams: any[]): void {
        if (this.shouldOutputLog) {
            console.log(message, ...optionalParams);
        }
    }

    public static error(message?: any, ...optionalParams: any[]): void {
        if (this.shouldOutputLog) {
            console.error(message, ...optionalParams);
        }
    }

    public static jsonError(format: string, error: any): void {
        if (this.shouldOutputLog) {
            console.error(format, JSON.stringify(error, null, 2));
        }
    }

    public static json(format: string, data: any): void {
        if (this.shouldOutputLog) {
            console.log(format, JSON.stringify(data, null, 2));
        }
    }
}
