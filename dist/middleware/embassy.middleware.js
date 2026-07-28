"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEmbassyContext = void 0;
const db_config_1 = require("../config/db.config");
const rbac_middleware_1 = require("./rbac.middleware");
const resolveEmbassyContext = async (req, _res, next) => {
    try {
        const embassyCode = req.headers['x-embassy-code'];
        if (embassyCode) {
            if (!req.user) {
                next();
                return;
            }
            const permissions = await (0, rbac_middleware_1.getUserPermissions)(req.user.userId);
            const hasEmbassyAccess = permissions.some((p) => p.startsWith('embassy:'));
            if (!hasEmbassyAccess) {
                next();
                return;
            }
            const embassy = await db_config_1.prisma.embassy.findUnique({
                where: { code: embassyCode },
            });
            if (embassy) {
                req.embassyContext = {
                    embassyId: embassy.id,
                    embassyCode: embassy.code,
                };
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.resolveEmbassyContext = resolveEmbassyContext;
