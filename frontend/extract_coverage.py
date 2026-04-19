import json
import sys

with open('coverage/coverage-final.json') as f:
    data = json.load(f)

targets = [
    "src/components/admin/cms/tabs/CmsProductionsTab.vue",
    "src/components/admin/cms/productions/CmsCreateProductionModal.vue"
]

for filepath, file_data in data.items():
    if any(target in filepath for target in targets):
        print(f"File: {filepath}")
        
        # Uncovered lines
        statement_map = file_data.get('s', {})
        uncovered_lines = []
        for stmt_id, count in statement_map.items():
            if count == 0:
                stmt_meta = file_data['statementMap'][stmt_id]
                uncovered_lines.append(stmt_meta['start']['line'])
        
        if uncovered_lines:
            uncovered_lines.sort()
            print(f"  Uncovered lines: {uncovered_lines}")
        else:
            print("  All lines covered.")

        # Uncovered branches
        branch_map = file_data.get('b', {})
        uncovered_branches = []
        for branch_id, counts in branch_map.items():
            for i, count in enumerate(counts):
                if count == 0:
                    branch_meta = file_data['branchMap'][branch_id]
                    uncovered_branches.append(f"Branch {branch_id} choice {i} at line {branch_meta['loc']['start']['line']}")
        
        if uncovered_branches:
            print("  Uncovered branches:")
            for b in uncovered_branches:
                print(f"    - {b}")
        else:
            print("  All branches covered.")
