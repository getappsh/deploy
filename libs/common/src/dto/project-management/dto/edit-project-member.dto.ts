import { RoleInProject } from "@app/common/database/entities";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsEmail, IsNotEmpty, IsEnum } from "class-validator";

export class EditProjectMemberDto{
    
    projectId: number;

    memberId: number;

    @IsString()
    @IsOptional()    
    @ApiProperty({required: false})
    firstName: string;

    @IsString()
    @IsOptional()    
    @ApiProperty({required: false})
    lastName: string;


    @IsOptional()    
    @IsEnum(RoleInProject)
    @ApiProperty({enum: RoleInProject, default: RoleInProject.PROJECT_MEMBER})
    role: string

}