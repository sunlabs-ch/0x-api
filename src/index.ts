import { getAppAsync, getDefaultAppDependenciesAsync } from './app';
import { defaultHttpServiceWithRateLimiterConfig } from './config';
import { logger } from './logger';
import { providerUtils } from './utils/provider_utils';
const os = require("os");
const cluster = require("cluster");

const clusterWorkerSize = os.cpus().length;

if (require.main === module) {
    const mainLoop = async () => {
        const provider = providerUtils.createWeb3Provider(
            defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl,
            defaultHttpServiceWithRateLimiterConfig.rpcRequestTimeout,
            defaultHttpServiceWithRateLimiterConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        await getAppAsync(dependencies, defaultHttpServiceWithRateLimiterConfig);
    };

    if (clusterWorkerSize > 1) {
        if (cluster.isMaster) {
            for (let i = 0; i < clusterWorkerSize; i++) {
                cluster.fork();
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
