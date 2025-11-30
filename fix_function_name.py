#!/usr/bin/env python3
"""Fix the processChaincodeeResponse function name typo"""

import sys

# Read the file
with open('/workspaces/Healthlink_RPC/my-project/rpc-server/server.js', 'r') as f:
    content = f.read()

# Count occurrences before
before_count = content.count('processChaincodeeResponse')
print(f"Found {before_count} occurrences of 'processChaincodeeResponse'")

# Replace all occurrences
content = content.replace('processChaincodeeResponse', 'processChaincodeResponse')

# Count occurrences after
after_count = content.count('processChaincodeResponse')
print(f"After replacement: {after_count} occurrences of 'processChaincodeResponse'")

# Write the file back
with open('/workspaces/Healthlink_RPC/my-project/rpc-server/server.js', 'w') as f:
    f.write(content)

print("✅ Successfully fixed function name typo")
