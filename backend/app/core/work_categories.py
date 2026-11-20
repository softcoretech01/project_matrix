# backend/app/core/work_categories.py
"""Predefined work categories. Each defines its own status workflow and the
category-specific custom fields a task of that type captures."""

WORK_CATEGORIES = [
    {"key": "general", "name": "General Task", "icon": "ph-check-square", "color": "#64748b",
     "statuses": ["To Do", "In Progress", "Pending", "Completed"], "doneStatuses": ["Completed"],
     "fields": []},

    {"key": "software", "name": "Software Development", "icon": "ph-code", "color": "#6366f1",
     "statuses": ["To Do", "In Progress", "Code Review", "Testing", "Done"], "doneStatuses": ["Done"],
     "fields": [
         {"key": "repoUrl", "label": "Repository URL", "type": "url"},
         {"key": "branch", "label": "Branch", "type": "text"},
         {"key": "module", "label": "Module / Component", "type": "text"},
         {"key": "severity", "label": "Severity", "type": "select", "options": ["Low", "Medium", "High", "Critical"]},
     ]},

    {"key": "sales", "name": "Sales & Lead Management", "icon": "ph-trend-up", "color": "#10b981",
     "statuses": ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"], "doneStatuses": ["Won"],
     # Leads are bulk-imported from an Excel sheet on the task (no manual per-lead fields)
     "leadsUpload": True,
     "fields": []},

    {"key": "calling", "name": "Client Calling", "icon": "ph-phone-call", "color": "#0ea5e9",
     "statuses": ["To Call", "Called", "Follow-up", "Connected", "Not Reachable", "Closed"],
     "doneStatuses": ["Connected", "Closed"],
     "fields": [
         {"key": "clientName", "label": "Client Name", "type": "text"},
         {"key": "phone", "label": "Phone", "type": "text"},
         {"key": "outcome", "label": "Call Outcome", "type": "select", "options": ["Interested", "Not Interested", "Callback", "No Answer"]},
         {"key": "callbackDate", "label": "Callback Date", "type": "date"},
     ]},

    {"key": "sitevisit", "name": "Real Estate Site Visit", "icon": "ph-map-pin", "color": "#f59e0b",
     "statuses": ["Scheduled", "En Route", "Visited", "Report Submitted", "Cancelled"],
     "doneStatuses": ["Report Submitted"],
     "fields": [
         {"key": "siteAddress", "label": "Site Address", "type": "text"},
         {"key": "mapLink", "label": "Google Maps Link", "type": "url"},
         {"key": "visitDate", "label": "Visit Date", "type": "date"},
         {"key": "clientName", "label": "Client", "type": "text"},
         {"key": "outcome", "label": "Outcome", "type": "select", "options": ["Interested", "Not Interested", "Negotiating"]},
     ]},

    {"key": "docverify", "name": "Document Verification", "icon": "ph-file-magnifying-glass", "color": "#8b5cf6",
     "statuses": ["Pending", "In Review", "Verified", "Rejected", "Resubmit"], "doneStatuses": ["Verified"],
     "fields": [
         {"key": "documentType", "label": "Document Type", "type": "select", "options": ["ID Proof", "Address Proof", "Income Proof", "Agreement", "Other"]},
         {"key": "referenceNo", "label": "Reference No.", "type": "text"},
         {"key": "result", "label": "Verification Result", "type": "select", "options": ["Valid", "Invalid", "Needs Clarification"]},
     ]},

    {"key": "marketing", "name": "Digital Marketing", "icon": "ph-megaphone", "color": "#ec4899",
     "statuses": ["Planned", "In Progress", "Scheduled", "Published", "Reporting", "Done"],
     "doneStatuses": ["Published", "Done"],
     "fields": [
         {"key": "channel", "label": "Channel", "type": "select", "options": ["SEO", "Social Media", "Email", "Paid Ads", "Content"]},
         {"key": "campaignUrl", "label": "Campaign URL", "type": "url"},
         {"key": "budget", "label": "Budget", "type": "number"},
         {"key": "goal", "label": "Goal / KPI", "type": "text"},
     ]},

    {"key": "admin", "name": "Administration", "icon": "ph-briefcase", "color": "#14b8a6",
     "statuses": ["To Do", "In Progress", "On Hold", "Done"], "doneStatuses": ["Done"],
     "fields": [
         {"key": "area", "label": "Area", "type": "select", "options": ["HR", "Finance", "Facilities", "IT", "General"]},
         {"key": "note", "label": "Note", "type": "text"},
     ]},
]

CATEGORY_BY_KEY = {c["key"]: c for c in WORK_CATEGORIES}

# Any status that counts as "complete" across all categories (for metrics/dashboards)
DONE_STATUSES = {"Completed", "Closed", "Done"} | {
    s for c in WORK_CATEGORIES for s in c["doneStatuses"]
}
