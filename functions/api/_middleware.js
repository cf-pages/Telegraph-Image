import { errorHandling, telemetryData } from '../utils/middleware.js';

export const onRequest = [errorHandling, telemetryData];
