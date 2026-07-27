import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../services/role.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from '../dto/role.dto';
import { ValidationError } from '../exceptions';

export class RoleController {
  private roleService: RoleService;

  constructor(roleService: RoleService) {
    this.roleService = roleService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreateRoleDto.sanitize(req.body);
      const errors = CreateRoleDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const role = await this.roleService.create(dto);
      res.status(201).json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.roleService.findAll(page, limit);
      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const role = await this.roleService.findById(id);
      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdateRoleDto.sanitize(req.body);
      const errors = UpdateRoleDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const role = await this.roleService.update(id, dto);
      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.roleService.delete(id);
      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  assignPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = AssignPermissionsDto.sanitize(req.body);
      const errors = AssignPermissionsDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const role = await this.roleService.assignPermissions(id, dto);
      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  };
}