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
  `name` VARCHAR(50) NOT NULL,
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
('E001', 'EMP001', 'Ravi Sharma', 'ravi@projectmatrix.com', '9876543210', 'Senior Developer', 'Engineering', 'E003', 25.00, 'Employee', 'Active', 'password123'),
('E002', 'EMP002', 'Kumar Gupta', 'kumar@projectmatrix.com', '9876543211', 'QA Engineer', 'Quality Assurance', 'E004', 20.00, 'Employee', 'Active', 'password123'),
('E003', 'EMP003', 'Sophia Patel', 'sophia@projectmatrix.com', '9876543212', 'Project Manager', 'PMO', 'E005', 50.00, 'PM', 'Active', 'password123'),
('E004', 'EMP004', 'Liam O\'Connor', 'liam@projectmatrix.com', '9876543213', 'Technical Lead', 'Engineering', 'E003', 40.00, 'Team Lead', 'Active', 'password123'),
('E005', 'EMP005', 'Emily Chen', 'emily@projectmatrix.com', '9876543214', 'VP Engineering', 'Executive', NULL, 75.00, 'Management', 'Active', 'password123'),
('E006', 'EMP006', 'Admin User', 'admin@projectmatrix.com', '9876543215', 'IT Director', 'Administration', NULL, 0.00, 'Admin', 'Active', 'admin');

INSERT INTO `clients` (`id`, `name`, `contactPerson`, `email`, `phone`, `country`, `status`) VALUES
('C001', 'Acme Corporation', 'John Doe', 'johndoe@acme.com', '123-456-7890', 'United States', 'Active'),
('C002', 'Globex Industries', 'Jane Smith', 'janesmith@globex.com', '234-567-8901', 'Canada', 'Active'),
('C003', 'TechStart Inc', 'Robert Lee', 'robert@techstart.io', '345-678-9012', 'United Kingdom', 'Active');

INSERT INTO `projects` (`id`, `code`, `name`, `clientId`, `pmId`, `startDate`, `endDate`, `estimatedHours`, `budget`, `billable`, `status`) VALUES
('P001', 'ERP', 'ERP Integration Suite', 'C001', 'E003', '2026-05-01', '2026-10-31', 1200, 50000.00, 1, 'Active'),
('P002', 'CRM', 'CRM Customer Portal', 'C002', 'E003', '2026-06-01', '2026-09-30', 800, 30000.00, 1, 'Active'),
('P003', 'TRN', 'Internal Training Program', 'C003', 'E004', '2026-01-01', '2026-12-31', 200, 5000.00, 0, 'Active');

INSERT INTO `modules` (`id`, `projectId`, `name`, `description`, `priority`, `status`) VALUES
('M001', 'P001', 'Inventory Management', 'Stock control and tracking modules', 'High', 'Active'),
('M002', 'P001', 'Purchase Orders', 'Requisitions and purchase orders', 'Medium', 'Active'),
('M003', 'P001', 'Financial Ledger', 'General ledger and accounting reports', 'High', 'Active'),
('M004', 'P002', 'Lead Acquisition', 'Capture leads from website and forms', 'High', 'Active'),
('M005', 'P002', 'Deals & Contacts', 'Manage sales deals pipeline', 'Medium', 'Active');

INSERT INTO `task_types` (`id`, `name`) VALUES
('TT1', 'Development'),
('TT2', 'Bug Fix'),
('TT3', 'Testing'),
('TT4', 'Support'),
('TT5', 'Meeting'),
('TT6', 'Documentation'),
('TT7', 'Training');

INSERT INTO `holidays` (`date`, `name`, `type`) VALUES
('2026-01-01', 'New Year\'s Day', 'Public'),
('2026-07-04', 'Independence Day', 'Public'),
('2026-11-26', 'Thanksgiving Day', 'Company'),
('2026-12-25', 'Christmas Day', 'Public');

INSERT INTO `allocations` (`id`, `employeeId`, `projectId`, `role`, `allocation`, `startDate`, `endDate`, `plannedHours`) VALUES
('A001', 'E001', 'P001', 'Senior Developer', 100, '2026-05-01', '2026-10-31', 800),
('A002', 'E002', 'P002', 'QA Tester', 50, '2026-06-01', '2026-09-30', 400),
('A003', 'E002', 'P001', 'QA Tester', 50, '2026-06-01', '2026-10-31', 400),
('A004', 'E004', 'P001', 'Technical Lead', 100, '2026-05-01', '2026-10-31', 800);

INSERT INTO `tasks` (`id`, `name`, `description`, `projectId`, `moduleId`, `priority`, `estimatedHours`, `startDate`, `endDate`, `assignedTo`, `reviewerId`, `status`, `progress`, `loggedHours`) VALUES
('T001', 'Stock Entry Screen UI', 'Create dynamic responsive grid for stock entry', 'P001', 'M001', 'High', 40, '2026-06-01', '2026-06-25', 'E001', 'E004', 'In Progress', 60, 24.00),
('T002', 'Financial Ledger Report', 'Generate accounting audit balance reports', 'P001', 'M003', 'High', 30, '2026-06-05', '2026-06-30', 'E002', 'E004', 'Assigned', 10, 8.00),
('T003', 'Lead Capture Form validation', 'Add JS validation to CRM capture screen', 'P002', 'M004', 'Medium', 20, '2026-06-08', '2026-06-18', 'E001', 'E003', 'Completed', 100, 18.00),
('T004', 'Database Query Optimization', 'Build indices for reporting speedups', 'P001', 'M003', 'High', 16, '2026-06-12', '2026-06-19', 'E004', 'E003', 'Review', 95, 15.00);

INSERT INTO `timesheets` (`id`, `date`, `employeeId`, `projectId`, `moduleId`, `taskId`, `hours`, `description`, `status`, `comments`, `submittedDate`) VALUES
('TS001', '2026-06-08', 'E001', 'P001', 'M001', 'T001', 8.00, 'Developed initial layout for Stock Entry Screen UI', 'Approved', 'Looks good', '2026-06-12'),
('TS002', '2026-06-09', 'E001', 'P001', 'M001', 'T001', 8.00, 'Added bindings to Stock Entry fields', 'Approved', 'Looks good', '2026-06-12'),
('TS003', '2026-06-10', 'E001', 'P001', 'M001', 'T001', 8.00, 'Fixed validation in Stock Entry API integration', 'Approved', 'Looks good', '2026-06-12'),
('TS004', '2026-06-11', 'E001', 'P002', 'M004', 'T003', 8.00, 'Created Lead Capture form template', 'Approved', 'Looks good', '2026-06-12'),
('TS005', '2026-06-12', 'E001', 'P002', 'M004', 'T003', 8.00, 'Added final touch to validation scripts', 'Approved', 'Looks good', '2026-06-12'),
('TS006', '2026-06-08', 'E002', 'P002', 'M004', 'T003', 4.00, 'Testing form components', 'Approved', 'Perfect', '2026-06-12'),
('TS007', '2026-06-08', 'E002', 'P001', 'M003', 'T002', 4.00, 'Auditing ledger ledger columns', 'Approved', 'Perfect', '2026-06-12'),
('TS008', '2026-06-09', 'E002', 'P001', 'M003', 'T002', 8.00, 'Initial test plan for Ledger Report', 'Approved', 'Perfect', '2026-06-12'),
('TS009', '2026-06-10', 'E002', 'P001', 'M003', 'T002', 8.00, 'Writing integration tests for ledger report', 'Approved', 'Perfect', '2026-06-12'),
('TS010', '2026-06-11', 'E002', 'P002', 'M004', 'T003', 8.00, 'Verification check on validation forms', 'Approved', 'Perfect', '2026-06-12'),
('TS011', '2026-06-12', 'E002', 'P002', 'M004', 'T003', 8.00, 'Signing off lead capture validation task', 'Approved', 'Perfect', '2026-06-12'),
('TS012', '2026-06-15', 'E001', 'P001', 'M001', 'T001', 8.00, 'Worked on grid performance issues', 'Submitted', '', '2026-06-17'),
('TS013', '2026-06-16', 'E001', 'P001', 'M001', 'T001', 8.00, 'Re-designed item rendering logic', 'Submitted', '', '2026-06-17'),
('TS014', '2026-06-17', 'E001', 'P001', 'M001', 'T001', 8.00, 'Connected grid actions to mock local DB state', 'Submitted', '', '2026-06-17'),
('TS015', '2026-06-18', 'E001', 'P001', 'M001', 'T001', 8.00, 'Implementing timesheet entry screens in HTML/CSS', 'Draft', '', NULL),
('TS016', '2026-06-19', 'E001', 'P001', 'M001', 'T001', 8.00, 'Polishing layout styling and transitions', 'Draft', '', NULL);

INSERT INTO `leaves` (`id`, `employeeId`, `startDate`, `endDate`, `type`, `status`, `comments`) VALUES
('L001', 'E001', '2026-07-06', '2026-07-07', 'Casual', 'Approved', 'Approved'),
('L002', 'E002', '2026-06-25', '2026-06-26', 'Sick', 'Pending', '');
