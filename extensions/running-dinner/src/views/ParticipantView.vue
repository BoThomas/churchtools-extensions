<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="dinnerStore.loading || participantStore.loading"
      class="flex justify-center py-12"
    >
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Content -->
    <div v-else>
      <div
        v-if="dinnerStore.publishedDinners.length === 0"
        class="text-center py-12"
      >
        <i class="pi pi-calendar-times text-6xl text-surface-400 mb-4"></i>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          No published dinners available at the moment.
        </p>
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <DinnerCard
          v-for="dinner in dinnerStore.publishedDinners"
          :key="dinner.id"
          :dinner="dinner.value"
          :participant-count="getParticipantCount(dinner.id!)"
        >
          <template #header>
            <Badge
              v-if="isRegistered(dinner.id!)"
              value="Registered"
              severity="success"
              class="absolute top-4 right-4"
            />
          </template>
          <template #actions>
            <div v-if="!isRegistered(dinner.id!)" class="flex flex-col gap-2">
              <Button
                label="Join"
                icon="pi pi-plus"
                size="small"
                @click="joinDinner(dinner)"
              />
              <div
                v-if="dinner.value.status !== 'published'"
                class="text-xs text-surface-500 dark:text-surface-400 italic"
              >
                <i class="pi pi-info-circle mr-1"></i>
                Registration is closed. You will be added to the waitlist and
                the organizer will confirm you manually.
              </div>
            </div>
            <div
              v-else-if="isRegistered(dinner.id!)"
              class="flex flex-col gap-2"
            >
              <div class="flex flex-wrap gap-2">
                <Button
                  v-if="hasRoute(dinner.id!)"
                  label="View Route"
                  icon="pi pi-map"
                  size="small"
                  @click="viewRoute(dinner)"
                />
                <DangerButton
                  label="Cancel Registration"
                  icon="pi pi-times"
                  size="small"
                  severity="danger"
                  outlined
                  @click="
                    confirmCancelRegistration(
                      dinner,
                      getRegistration(dinner.id!),
                    )
                  "
                />
                <SecondaryButton
                  label="Edit Registration"
                  icon="pi pi-pencil"
                  size="small"
                  :disabled="isGroupsCreatedOrLater(dinner.value.status)"
                  @click="editRegistration(dinner, getRegistration(dinner.id!))"
                />
              </div>
              <div
                v-if="isGroupsCreatedOrLater(dinner.value.status)"
                class="text-xs text-surface-500 dark:text-surface-400 italic"
              >
                <i class="pi pi-info-circle mr-1"></i>
                Editing is no longer available. Please contact the organizer for
                changes.
              </div>
            </div>
          </template>
        </DinnerCard>
      </div>
    </div>

    <!-- Registration Dialog -->
    <Dialog
      v-model:visible="showRegistrationDialog"
      :header="
        editingRegistration
          ? 'Edit Your Registration'
          : 'Register for Running Dinner'
      "
      :modal="true"
      :style="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
    >
      <ParticipantForm
        v-if="selectedDinner"
        :dinner-id="selectedDinner.id!"
        :current-user="currentUser"
        :initial-data="editingRegistration?.value"
        :allow-preferred-meal="selectedDinner.value.allowPreferredMeal"
        :saving="participantStore.saving"
        @submit="handleRegistrationSubmit"
        @cancel="closeRegistrationDialog"
      />
    </Dialog>

    <!-- Route Display Dialog -->
    <Dialog
      v-model:visible="showRouteDialog"
      :header="selectedDinner?.value.name"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '1000px', maxHeight: '90vh' }"
    >
      <RouteDisplay
        v-if="selectedDinner && selectedRoute"
        :dinner="selectedDinner.value"
        :route="selectedRoute"
        :group="selectedGroup"
        :participants="participantStore.participants"
        :all-groups="groupStore.getByDinnerId(selectedDinner.id!)"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import type { Participant } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useRunningDinnerStore } from '../stores/runningDinner';
import { useParticipantStore } from '../stores/participant';
import { useGroupStore } from '../stores/group';
import { useRouteStore } from '../stores/route';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import DinnerCard from '../components/DinnerCard.vue';
import ParticipantForm from '../components/ParticipantForm.vue';
import RouteDisplay from '../components/RouteDisplay.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const groupStore = useGroupStore();
const routeStore = useRouteStore();
const toast = useToast();
const confirm = useConfirm();
const currentUser = ref<Person | null>(null);
const showRegistrationDialog = ref(false);
const showRouteDialog = ref(false);
const selectedDinner = ref<CategoryValue<any> | null>(null);
const editingRegistration = ref<CategoryValue<Participant> | null>(null);
const selectedRoute = ref<CategoryValue<any> | null>(null);
const selectedGroup = ref<CategoryValue<any> | null>(null);

const myRegistrations = computed(() => {
  if (!currentUser.value?.id) return [];
  return participantStore.getByPersonId(currentUser.value.id);
});

onMounted(async () => {
  try {
    currentUser.value = (await churchtoolsClient.get('/whoami')) as Person;
    await Promise.all([
      dinnerStore.fetchAll(),
      participantStore.fetchAll(),
      groupStore.fetchAll(),
      routeStore.fetchAll(),
    ]);
  } catch (e) {
    console.error('Failed to load data', e);
  }
});

function getParticipantCount(dinnerId: number): number {
  return participantStore.getConfirmedByDinnerId(dinnerId).length;
}

function isRegistered(dinnerId: number): boolean {
  return myRegistrations.value.some(
    (reg) =>
      reg.value.dinnerId === dinnerId &&
      reg.value.registrationStatus !== 'cancelled',
  );
}

function getRegistration(dinnerId: number) {
  return myRegistrations.value.find(
    (reg) =>
      reg.value.dinnerId === dinnerId &&
      reg.value.registrationStatus !== 'cancelled',
  );
}

function getCancelledRegistration(dinnerId: number) {
  return myRegistrations.value.find(
    (reg) =>
      reg.value.dinnerId === dinnerId &&
      reg.value.registrationStatus === 'cancelled',
  );
}

function hasRoute(dinnerId: number): boolean {
  const registration = getRegistration(dinnerId);
  if (!registration?.value.groupId) return false;

  const route = routeStore.routes.find(
    (r) => r.value.groupId === registration.value.groupId,
  );
  return !!route;
}

function viewRoute(dinner: CategoryValue<any>) {
  const registration = getRegistration(dinner.id!);
  if (!registration?.value.groupId) return;

  const group = groupStore.groups.find(
    (g) => g.id === registration.value.groupId,
  );
  const route = routeStore.routes.find(
    (r) => r.value.groupId === registration.value.groupId,
  );

  if (group && route) {
    selectedDinner.value = dinner;
    selectedGroup.value = group;
    selectedRoute.value = route;
    showRouteDialog.value = true;
  }
}

function editRegistration(
  dinner: CategoryValue<any>,
  registration: CategoryValue<Participant> | undefined,
) {
  if (!registration) return;
  selectedDinner.value = dinner;
  editingRegistration.value = registration;
  showRegistrationDialog.value = true;
}

function joinDinner(dinner: CategoryValue<any>) {
  selectedDinner.value = dinner;
  editingRegistration.value = null;
  showRegistrationDialog.value = true;
}

async function handleRegistrationSubmit(data: Omit<Participant, 'id'>) {
  try {
    if (editingRegistration.value?.id) {
      // Update existing registration
      await participantStore.update(editingRegistration.value.id, data);
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Your registration has been updated successfully',
        life: 3000,
      });
    } else {
      // Check if there's a cancelled registration to reuse
      const cancelledReg = getCancelledRegistration(selectedDinner.value!.id!);

      if (cancelledReg) {
        // Check if dinner is at max capacity or registration is closed
        const dinner = selectedDinner.value?.value;
        if (dinner) {
          const confirmedCount = participantStore.getConfirmedByDinnerId(
            selectedDinner.value!.id!,
          ).length;

          // If at capacity OR registration is closed, set status to waitlist
          if (
            confirmedCount >= dinner.maxParticipants ||
            dinner.status !== 'published'
          ) {
            data.registrationStatus = 'waitlist';
            const reason =
              confirmedCount >= dinner.maxParticipants
                ? 'This dinner is at capacity.'
                : 'Registration is closed.';

            // Reuse cancelled registration by updating it with waitlist status
            await participantStore.update(cancelledReg.id, data);

            toast.add({
              severity: 'warn',
              summary: 'Added to Waitlist',
              detail: `${reason} You have been added to the waitlist. The organizer will confirm your registration manually.`,
              life: 5000,
            });
          } else {
            // Reuse cancelled registration with confirmed status
            await participantStore.update(cancelledReg.id, data);
            toast.add({
              severity: 'success',
              summary: 'Registered',
              detail: 'You have been registered for this dinner',
              life: 3000,
            });
          }
        }
      } else {
        // Check if dinner is at max capacity or registration is closed
        const dinner = selectedDinner.value?.value;
        if (dinner) {
          const confirmedCount = participantStore.getConfirmedByDinnerId(
            selectedDinner.value!.id!,
          ).length;

          // If at capacity OR registration is closed, set status to waitlist
          if (
            confirmedCount >= dinner.maxParticipants ||
            dinner.status !== 'published'
          ) {
            data.registrationStatus = 'waitlist';
            const reason =
              confirmedCount >= dinner.maxParticipants
                ? 'This dinner is at capacity.'
                : 'Registration is closed.';
            toast.add({
              severity: 'warn',
              summary: 'Added to Waitlist',
              detail: `${reason} You have been added to the waitlist. The organizer will confirm your registration manually.`,
              life: 5000,
            });
          }
        }

        // Create new registration
        await participantStore.create(data);

        if (data.registrationStatus === 'confirmed') {
          toast.add({
            severity: 'success',
            summary: 'Registered',
            detail: 'You have been registered for this dinner',
            life: 3000,
          });
        }
      }
    }
    closeRegistrationDialog();
    // Refresh participant list
    await participantStore.fetchAll();
  } catch (e) {
    console.error('Failed to save registration', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save registration. Please try again.',
      life: 3000,
    });
  }
}

function closeRegistrationDialog() {
  showRegistrationDialog.value = false;
  selectedDinner.value = null;
  editingRegistration.value = null;
}

function confirmCancelRegistration(
  dinner: CategoryValue<any>,
  registration: CategoryValue<Participant> | undefined,
) {
  if (!registration) return;

  const isGroupsCreated = isGroupsCreatedOrLater(dinner.value.status);
  const message = isGroupsCreated
    ? `Are you sure you want to cancel your registration for "${dinner.value.name}"? Groups have already been created, so the organizer will need to manually adjust the groups. This action cannot be undone.`
    : `Are you sure you want to cancel your registration for "${dinner.value.name}"? This action cannot be undone.`;

  confirm.require({
    message,
    header: 'Cancel Registration',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'No, Keep Registration',
    acceptLabel: 'Yes, Cancel Registration',
    accept: async () => {
      try {
        await participantStore.cancel(registration.id);
        const notificationDetail = isGroupsCreated
          ? 'Your registration has been cancelled. Please inform the organizer about any necessary group adjustments.'
          : 'Your registration has been cancelled successfully';
        toast.add({
          severity: 'success',
          summary: 'Registration Cancelled',
          detail: notificationDetail,
          life: 5000,
        });
        // TODO: Send notification to organizer when groups are already created
        await participantStore.fetchAll();
      } catch (e) {
        console.error('Failed to cancel registration', e);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel registration. Please try again.',
          life: 3000,
        });
      }
    },
  });
}

function isGroupsCreatedOrLater(status: string): boolean {
  return ['groups-created', 'routes-assigned', 'completed'].includes(status);
}
</script>
