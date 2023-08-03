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

"""Track device object information."""

from dataclasses import dataclass

@dataclass
class Device():
  """Represents a physical device and it's configuration."""

  mac_addr: str = None
  manufacturer: str = None
  model: str = None
  test_modules: str = None
  ip_addr: str = None
  device_folder: str = None
  max_device_reports: int = None
