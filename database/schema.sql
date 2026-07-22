-- database/schema.sql
-- ProjectMatrix Database Initialization Script

CREATE DATABASE IF NOT EXISTS `projectmatrix`;
USE `projectmatrix`;

-- 1. Employees Table
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` VARCHAR(10) NOT NULL,
  `code` VARCHAR(15) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `mobile` VARCHAR(15) DEFAULT NULL,
  `designation` VARCHAR(100) DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `managerId` VARCHAR(10) DEFAULT NULL,
  `costPerHour` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `role` ENUM('Admin', 'PM', 'Team Lead', 'Employee', 'Management') NOT NULL DEFAULT 'Employee',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `password` VARCHAR(255) NOT NULL DEFAULT 'password123',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Clients Table
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `contactPerson` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `country` VARCHAR(50) NOT NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Projects Table
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` VARCHAR(10) NOT NULL,
  `code` VARCHAR(15) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `clientId` VARCHAR(10) NOT NULL,
  `pmId` VARCHAR(10) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `estimatedHours` INT NOT NULL DEFAULT 0,
  `budget` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `billable` BOOLEAN NOT NULL DEFAULT TRUE,
  `status` ENUM('Active', 'Completed', 'Closed') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_projects_clients` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_pm` FOREIGN KEY (`pmId`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Modules Table
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` VARCHAR(10) NOT NULL,
  `projectId` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `priority` ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_modules_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Task Types Table
DROP TABLE IF EXISTS `task_types`;
CREATE TABLE `task_types` (
  `id` VARCHAR(10) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Holidays Table
DROP TABLE IF EXISTS `holidays`;
CREATE TABLE `holidays` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `date` DATE NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('Public', 'Company') NOT NULL DEFAULT 'Public',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Allocations Table
DROP TABLE IF EXISTS `allocations`;
CREATE TABLE `allocations` (
  `id` VARCHAR(10) NOT NULL,
  `employeeId` VARCHAR(10) NOT NULL,
  `projectId` VARCHAR(10) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `allocation` INT NOT NULL DEFAULT 100,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `plannedHours` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_allocations_employees` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_allocations_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tasks Table
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` VARCHAR(10) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `projectId` VARCHAR(10) NOT NULL,
  `moduleId` VARCHAR(10) NOT NULL,
  `priority` ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
  `estimatedHours` INT NOT NULL DEFAULT 0,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `assignedTo` VARCHAR(10) NOT NULL,
  `reviewerId` VARCHAR(10) NOT NULL,
  `status` ENUM('Open', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed') NOT NULL DEFAULT 'Open',
  `progress` INT NOT NULL DEFAULT 0,
  `loggedHours` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tasks_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_modules` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_assigned` FOREIGN KEY (`assignedTo`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_tasks_reviewer` FOREIGN KEY (`reviewerId`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Timesheets Table
DROP TABLE IF EXISTS `timesheets`;
CREATE TABLE `timesheets` (
  `id` VARCHAR(10) NOT NULL,
  `date` DATE NOT NULL,
  `employeeId` VARCHAR(10) NOT NULL,
  `projectId` VARCHAR(10) NOT NULL,
  `moduleId` VARCHAR(10) NOT NULL,
  `taskId` VARCHAR(10) NOT NULL,
  `hours` DECIMAL(5,2) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('Draft', 'Submitted', 'Approved', 'Rejected') NOT NULL DEFAULT 'Draft',
  `comments` TEXT,
  `submittedDate` DATE DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_timesheets_employees` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_modules` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_tasks` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Leaves Table
DROP TABLE IF EXISTS `leaves`;
CREATE TABLE `leaves` (
  `id` VARCHAR(10) NOT NULL,
  `employeeId` VARCHAR(10) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `type` ENUM('Casual', 'Sick', 'Privilege') NOT NULL DEFAULT 'Casual',
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `comments` TEXT,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_leaves_employees` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==================== SEED DATA INITIALIZATION ====================

INSERT INTO `employees` (`id`, `code`, `name`, `email`, `mobile`, `designation`, `department`, `managerId`, `costPerHour`, `role`, `status`, `password`) VALUES
('E006', 'EMP006', 'Admin User', 'admin@projectmatrix.com', '9876543215', 'IT Director', 'Administration', NULL, 0.00, 'Admin', 'Active', 'admin');

INSERT INTO `clients` (`id`, `name`, `contactPerson`, `email`, `phone`, `country`, `status`) VALUES
('C001', 'Acme Corporation', 'John Doe', 'johndoe@acme.com', '123-456-7890', 'United States', 'Active'),
('C002', 'Globex Industries', 'Jane Smith', 'janesmith@globex.com', '234-567-8901', 'Canada', 'Active'),
('C003', 'TechStart Inc', 'Robert Lee', 'robert@techstart.io', '345-678-9012', 'United Kingdom', 'Active');



INSERT INTO `task_types` (`id`, `code`, `name`, `description`, `status`) VALUES
('TT1', 'TT-DEV', 'Development', 'Software development tasks', 'Active'),
('TT2', 'TT-TEST', 'Testing', 'QA and testing tasks', 'Active'),
('TT3', 'TT-DESIGN', 'Design', 'UI/UX design tasks', 'Active'),
('TT4', 'TT-DOC', 'Documentation', 'Writing and reviewing docs', 'Active'),
('TT5', 'TT-MEET', 'Meeting', 'Client or team meetings', 'Active'),
('TT6', 'TT-SUPPORT', 'Support', 'Customer support', 'Active'),
('TT7', 'TT-IDLE', 'Idle', 'No billable work', 'Active');

INSERT INTO `holidays` (`date`, `name`, `type`) VALUES
('2026-01-01', 'New Year\'s Day', 'Public'),
('2026-07-04', 'Independence Day', 'Public'),
('2026-11-26', 'Thanksgiving Day', 'Company'),
('2026-12-25', 'Christmas Day', 'Public');
