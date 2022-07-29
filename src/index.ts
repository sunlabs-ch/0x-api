import { getAppAsync, getDefaultAppDependenciesAsync } from './app';
import { defaultHttpServiceWithRateLimiterConfig } from './config';
import { logger } from './logger';
import { providerUtils } from './utils/provider_utils';
const os = require("os");
const cluster = require("cluster");

if (!process.env["ETHEREUM_RPC_URL_00"]) process.exit(1);
let ethRpcUrl: string = process.env["ETHEREUM_RPC_URL_00"] as string;
const rpcArr: { [key: string]: string }[] = [];

if (cluster.isMaster) {
    for (let i = 0; true; i++) {
        const rpcEnv = "ETHEREUM_RPC_URL_" + i.toString().padStart(2, "0");
        if (!process.env[rpcEnv]) {
            break;
        }
        rpcArr.push({ ETHEREUM_RPC_URL: process.env[rpcEnv] as string });
    };
} else {
    if (!process.env["ETHEREUM_RPC_URL"]) process.exit(1);
    ethRpcUrl = process.env["ETHEREUM_RPC_URL"] as string;
}

const clusterWorkerSize = Math.min(os.cpus().length * 2, rpcArr.length);


if (require.main === module) {
    const mainLoop = async () => {
        const provider = providerUtils.createWeb3Provider(
            ethRpcUrl,
            defaultHttpServiceWithRateLimiterConfig.rpcRequestTimeout,
            defaultHttpServiceWithRateLimiterConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        await getAppAsync(dependencies, defaultHttpServiceWithRateLimiterConfig);
    };

    if (clusterWorkerSize > 1) {
        if (cluster.isMaster) {
            for (let i = 0; i < clusterWorkerSize; i++) {
                cluster.fork(rpcArr[i]);
            }
            cluster.on("exit", function (worker: any) {
                console.log("Worker", worker.id, " has exited.")
            })
        } else {
            mainLoop().catch((err) => logger.error(err.stack));
        }
    } else {
        mainLoop().catch((err) => logger.error(err.stack));
    }
}
process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    if (err) {
        logger.error(err);
    }
});
