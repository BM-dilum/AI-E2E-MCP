import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  position: string;

  @Column('integer')
  salaryCents: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}