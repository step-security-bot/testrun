# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import paramiko
import util

LOGGER = None

class PortUtil():
  """Utilities for port control"""

  def __init__(self, switch_config, logger):

    self._switch_config = switch_config

    global LOGGER
    LOGGER = logger

  def _get_ssh_client(self):
    try:
      client = paramiko.SSHClient()
      client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
      return client
    except Exception:
      return None

  def switch_online(self):
    """Returns True if the switch responds to ping request"""
    cmd = "ping -c 5 " + self._switch_config.get("host")
    success = util.run_command(cmd, output=True)
    if success:
      LOGGER.info("Switch has been detected")
      return True
    else:
      LOGGER.info("Switch has not been detected")
      return False

  def get_port_link(self):
    ssh_client = self._get_ssh_client()
    ssh_client.connect(self._switch_config.get("host"),
                       int(self._switch_config.get("ssh_port")),
                       self._switch_config.get("username"),
                       self._switch_config.get("password"),
                       look_for_keys=False,
                       allow_agent=False)
    stdout = self._exec(ssh_client, "ethtool " +
                        self._switch_config.get("device_intf") +
                        " | grep \"Link detected\"")[1]

    response = stdout.read().decode().strip()
    LOGGER.info(response)
    ssh_client.close()
    if response == "Link detected: no":
      return False
    elif response == "Link detected: yes":
      return True
    return None

  def _exec(self, client, command):
    stdin, stdout, stderr = client.exec_command(command)
    return stdin, stdout, stderr
