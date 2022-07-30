import Axios from 'axios';
import axiosThrottle from "axios-request-throttle";

export const axios = Axios.create();

axiosThrottle.use(axios, { requestsPerSecond: 200 });