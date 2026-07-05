import { Module } from "@nestjs/common";
import { Ec2Controller } from "./ec2.controller.js";

@Module({ controllers: [Ec2Controller] })
export class Ec2Module {}
