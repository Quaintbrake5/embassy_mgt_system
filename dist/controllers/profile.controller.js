"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profile_dto_1 = require("../dto/profile.dto");
const exceptions_1 = require("../exceptions");
class ProfileController {
    constructor(profileService) {
        this.create = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                const dto = profile_dto_1.CreateProfileDto.sanitize(req.body);
                const errors = profile_dto_1.CreateProfileDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const profile = await this.profileService.createProfile(userId, dto, req.user?.userId);
                res.status(201).json({ success: true, data: profile });
            }
            catch (error) {
                next(error);
            }
        };
        this.getMyProfile = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                const profile = await this.profileService.getProfile(userId, req.user?.userId);
                res.json({ success: true, data: profile });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMyProfile = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                const dto = profile_dto_1.UpdateProfileDto.sanitize(req.body);
                const errors = profile_dto_1.UpdateProfileDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const profile = await this.profileService.updateProfile(userId, dto, req.user?.userId);
                res.json({ success: true, data: profile });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteMyProfile = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                await this.profileService.deleteProfile(userId, req.user?.userId);
                res.json({ success: true, message: 'Profile deleted successfully (GDPR anonymization)' });
            }
            catch (error) {
                next(error);
            }
        };
        this.findProfileByOfficer = async (req, res, next) => {
            try {
                const id = req.params.id;
                const officerId = req.user?.userId;
                if (!officerId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                const profile = await this.profileService.findProfileByOfficer(id, officerId);
                res.json({ success: true, data: profile });
            }
            catch (error) {
                next(error);
            }
        };
        this.profileService = profileService;
    }
}
exports.ProfileController = ProfileController;
