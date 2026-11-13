-- ================================================================================
-- Techspire Portal V2 (Project Matrix) - Database Initialization Dump
-- Database: `projectmatrix`
-- Generated & Verified: November 2026
-- Tested Roles: Admin User, Priya (Dev), Sophia Davis (PM), Liam Miller (Lead), Emily Watson (Exec)
-- ================================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `projectmatrix` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `projectmatrix`;

-- --------------------------------------------------------------------------------
-- Table 1: employees (Official 5 Accounts)
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `managerId` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costPerHour` decimal(10,2) NOT NULL DEFAULT '0.00',
  `role` enum('Admin','PM','Team Lead','Employee','Management') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Employee',
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'password123',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `employees` (`id`, `code`, `name`, `email`, `mobile`, `designation`, `department`, `managerId`, `costPerHour`, `role`, `status`, `password`) VALUES
  ('E006', 'EMP006', 'Admin User', 'admin@projectmatrix.com', '9876543215', 'IT Director', 'Administration', NULL, 0.00, 'Admin', 'Active', 'admin'),
  ('E007', 'EMP007', 'Priya', 'priya@projectmatrix.com', '9876543216', 'Frontend Developer', 'Engineering', 'E006', 0.00, 'Employee', 'Active', 'password123'),
  ('E008', 'EMP008', 'Sophia Davis', 'sophia@projectmatrix.com', '9876543217', 'Project Manager', 'Engineering', 'E006', 0.00, 'PM', 'Active', 'password123'),
  ('E009', 'EMP009', 'Liam Miller', 'liam@projectmatrix.com', '9876543218', 'Team Lead', 'Engineering', 'E006', 0.00, 'Team Lead', 'Active', 'password123'),
  ('E010', 'EMP010', 'Emily Watson', 'emily@projectmatrix.com', '9876543219', 'Executive Director', 'Management', NULL, 0.00, 'Management', 'Active', 'password123');

-- --------------------------------------------------------------------------------
-- Table 2: clients
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPerson` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `clients` (`id`, `name`, `contactPerson`, `email`, `phone`, `country`, `status`) VALUES
  ('C239570', 'RetailTech Corp', 'John Doe', 'client@retailtech.com', '+1-800-555-0199', 'United States', 'Active');

-- --------------------------------------------------------------------------------
-- Table 3: projects
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pmId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `estimatedHours` int NOT NULL DEFAULT '0',
  `budget` decimal(15,2) NOT NULL DEFAULT '0.00',
  `billable` tinyint(1) NOT NULL DEFAULT '1',
  `status` enum('Active','Completed','Closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `description` text COLLATE utf8mb4_unicode_ci,
  `owner` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Admin User',
  `reviewRequired` tinyint(1) DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_projects_clients` (`clientId`),
  KEY `fk_projects_pm` (`pmId`),
  CONSTRAINT `fk_projects_clients` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_pm` FOREIGN KEY (`pmId`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `projects` (`id`, `code`, `name`, `clientId`, `pmId`, `startDate`, `endDate`, `estimatedHours`, `budget`, `billable`, `status`, `description`, `owner`, `reviewRequired`, `createdAt`) VALUES
  ('P488457', 'PRJ-001', 'E-Commerce Web Portal', 'C239570', 'E006', '2026-11-12', '2027-02-10', 160, 25000.00, 1, 'Active', 'Online shopping platform with product catalog, shopping cart, and secure checkout.', 'Sophia Davis', 0, '2026-11-12 18:30:57');

-- --------------------------------------------------------------------------------
-- Table 4: project_members
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `project_members`;
CREATE TABLE `project_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Member',
  `addedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_project_members_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `project_members` (`id`, `projectId`, `employeeName`, `role`, `addedAt`) VALUES
  (1, 'P488457', 'Sophia Davis', 'Project Lead', '2026-11-12 18:30:57'),
  (2, 'P488457', 'Priya', 'Developer', '2026-11-12 18:37:23'),
  (3, 'P488457', 'Liam Miller', 'Project Lead', '2026-11-12 18:37:39');

-- --------------------------------------------------------------------------------
-- Table 5: project_sections
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `project_sections`;
CREATE TABLE `project_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sortOrder` int DEFAULT '0',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_project_sections_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `project_sections` (`id`, `projectId`, `name`, `sortOrder`, `createdAt`) VALUES
  (1, 'P488457', 'Frontend Architecture', 1, '2026-11-12 18:30:57'),
  (2, 'P488457', 'Backend API Integration', 2, '2026-11-12 18:30:57'),
  (3, 'P488457', 'QA & Testing', 3, '2026-11-12 18:30:57'),
  (4, 'P488457', 'UI & Frontend', 4, '2026-11-12 18:34:36'),
  (5, 'P488457', 'Backend API', 5, '2026-11-12 18:34:46');

-- --------------------------------------------------------------------------------
-- Table 6: modules
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `priority` enum('High','Medium','Low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`),
  KEY `fk_modules_projects` (`projectId`),
  CONSTRAINT `fk_modules_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `modules` (`id`, `projectId`, `name`, `description`, `priority`, `status`) VALUES
  ('M489111', 'P488457', 'General Module', 'Core e-commerce functional module', 'Medium', 'Active');

-- --------------------------------------------------------------------------------
-- Table 7: task_types
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `task_types`;
CREATE TABLE `task_types` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `task_types` (`id`, `code`, `name`, `description`, `status`) VALUES
  ('TT432340', 'TT001', 'Development', 'Software feature engineering & UI tasks', 'Active'),
  ('TT432341', 'TT002', 'QA & Testing', 'Quality assurance and unit testing', 'Active'),
  ('TT432342', 'TT003', 'Architecture', 'System architecture and review', 'Active');

-- --------------------------------------------------------------------------------
-- Table 8: tasks (Includes createdBy for 'Assigned By' Tracking)
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `projectId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('High','Medium','Low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `estimatedHours` int NOT NULL DEFAULT '0',
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `assignedTo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewerId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Open','Assigned','In Progress','Review','Completed','Closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open',
  `progress` int NOT NULL DEFAULT '0',
  `loggedHours` decimal(10,2) NOT NULL DEFAULT '0.00',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `assignee` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_to` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dueDate` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `end_date` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdBy` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Sophia Davis (PM)',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `completedAt` datetime DEFAULT NULL,
  `parentTaskId` int DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tasks_projects` (`projectId`),
  KEY `fk_tasks_modules` (`moduleId`),
  KEY `fk_tasks_assigned` (`assignedTo`),
  KEY `fk_tasks_reviewer` (`reviewerId`),
  CONSTRAINT `fk_tasks_assigned` FOREIGN KEY (`assignedTo`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_tasks_modules` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_reviewer` FOREIGN KEY (`reviewerId`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tasks` (`id`, `name`, `description`, `projectId`, `moduleId`, `priority`, `estimatedHours`, `startDate`, `endDate`, `assignedTo`, `reviewerId`, `status`, `progress`, `loggedHours`, `title`, `project`, `project_id`, `assignee`, `assigned_to`, `dueDate`, `start_date`, `end_date`, `createdBy`, `createdAt`, `completedAt`, `parentTaskId`, `code`) VALUES
  ('TASK489111', 'Build Shopping Cart UI', 'Design and implement responsive cart items list, quantity counters, and checkout button.', 'P488457', 'M489111', 'High', 16, '2026-11-12', '2026-11-20', 'E007', 'E006', 'Closed', 100, 16.00, 'Build Shopping Cart UI', 'E-Commerce Web Portal', NULL, 'Priya', 'Priya', '2026-11-20', '2026-11-12', '2026-11-20', 'Sophia Davis (PM)', '2026-11-12 18:30:57', '2026-11-12 19:31:19', NULL, 'TASK489111'),
  ('TASK492593', 'Implement Stripe Payment Gateway Integration', 'Integrate Stripe checkout API, handle webhook responses and secure payment flow.', 'P488457', 'M489111', 'High', 24, '2026-11-12', '2026-11-25', 'E007', 'E006', 'Open', 0, 0.00, 'Implement Stripe Payment Gateway Integration', 'E-Commerce Web Portal', NULL, 'Priya', 'Priya', '2026-11-25', '2026-11-12', '2026-11-25', 'Liam Miller (Team Lead)', '2026-11-12 19:40:00', NULL, NULL, 'TASK492593');

-- --------------------------------------------------------------------------------
-- Table 9: subtasks
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `subtasks`;
CREATE TABLE `subtasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `taskId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDone` tinyint(1) DEFAULT '0',
  `sortOrder` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `ix_subtasks_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `subtasks` (`id`, `taskId`, `title`, `isDone`, `sortOrder`) VALUES
  (1, 'TASK489111', 'Design cart layout', 1, 0),
  (2, 'TASK489111', 'Add quantity counter buttons', 1, 0),
  (3, 'TASK489111', 'Implement checkout button & state', 1, 0);

-- --------------------------------------------------------------------------------
-- Table 10: task_comments
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `task_comments`;
CREATE TABLE `task_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `taskId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Priya',
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_task_comments_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `task_comments` (`id`, `taskId`, `author`, `text`, `createdAt`) VALUES
  (1, 'TASK489111', 'Priya', 'Shopping cart responsive UI components completed', '2026-11-12 18:59:36'),
  (2, 'TASK489111', 'Sophia Davis', '[Formal Closure Sign-Off]: Task reviewed, approved, and closed.', '2026-11-12 19:31:19');

-- --------------------------------------------------------------------------------
-- Table 11: task_activity
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `task_activity`;
CREATE TABLE `task_activity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `taskId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fieldName` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oldValue` text COLLATE utf8mb4_unicode_ci,
  `newValue` text COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_task_activity_task` (`taskId`),
  KEY `fk_task_activity_employee` (`employeeId`),
  CONSTRAINT `fk_task_activity_employee` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_task_activity_task` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------
-- Table 12: allocations
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `allocations`;
CREATE TABLE `allocations` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allocation` int NOT NULL DEFAULT '100',
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `plannedHours` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_allocations_employees` (`employeeId`),
  KEY `fk_allocations_projects` (`projectId`),
  CONSTRAINT `fk_allocations_employees` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_allocations_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------
-- Table 13: timesheets
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `timesheets`;
CREATE TABLE `timesheets` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `employeeId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `projectId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taskId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Draft','Submitted','Approved','Rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Draft',
  `comments` text COLLATE utf8mb4_unicode_ci,
  `submittedDate` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_timesheets_employees` (`employeeId`),
  KEY `fk_timesheets_projects` (`projectId`),
  KEY `fk_timesheets_modules` (`moduleId`),
  KEY `fk_timesheets_tasks` (`taskId`),
  CONSTRAINT `fk_timesheets_employees` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_modules` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_projects` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_tasks` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------
-- Table 14: leaves
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `leaves`;
CREATE TABLE `leaves` (
  `id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `type` enum('Casual','Sick','Privilege') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Casual',
  `status` enum('Pending','Approved','Rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `comments` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_leaves_employees` (`employeeId`),
  CONSTRAINT `fk_leaves_employees` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------------
-- Table 15: holidays
-- --------------------------------------------------------------------------------
DROP TABLE IF EXISTS `holidays`;
CREATE TABLE `holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('Public','Company') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Public',
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `holidays` (`id`, `date`, `name`, `type`) VALUES
  (1, '2026-01-01', 'New Year\'s Day', 'Public'),
  (2, '2026-07-04', 'Independence Day', 'Public'),
  (3, '2026-11-26', 'Thanksgiving Day', 'Company'),
  (4, '2026-12-25', 'Christmas Day', 'Public');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
